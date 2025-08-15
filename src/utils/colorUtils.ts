import { ColorPoint } from '../types';

// 从图片的指定位置获取颜色
export const getColorFromImage = (
  image: HTMLImageElement,
  x: number,
  y: number
): { color: string; hex: string } => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return { color: '#000000', hex: '#000000' };
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  
  ctx.drawImage(image, 0, 0);
  
  // 计算相对位置
  const relativeX = Math.floor((x / image.offsetWidth) * image.naturalWidth);
  const relativeY = Math.floor((y / image.offsetHeight) * image.naturalHeight);
  
  const imageData = ctx.getImageData(relativeX, relativeY, 1, 1);
  const data = imageData.data;
  
  const r = data[0];
  const g = data[1];
  const b = data[2];
  
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  const color = `rgb(${r}, ${g}, ${b})`;
  
  return { color, hex };
};

// 生成随机位置的颜色点
export const generateRandomColorPoints = (
  count: number,
  imageWidth: number,
  imageHeight: number
): Omit<ColorPoint, 'color' | 'hex'>[] => {
  const points: Omit<ColorPoint, 'color' | 'hex'>[] = [];
  
  for (let i = 0; i < count; i++) {
    const x = Math.random() * (imageWidth - 32) + 16; // 避免边缘
    const y = Math.random() * (imageHeight - 32) + 16;
    
    points.push({
      id: i + 1,
      x,
      y,
    });
  }
  
  return points;
};

// 格式化颜色数组为 JavaScript 数组字符串
export const formatColorArray = (colors: string[]): string => {
  return JSON.stringify(colors, null, 2);
};

// === 新增：颜色多样性相关工具 ===
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
};

export const colorDistance = (hexA: string, hexB: string): number => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

export const averagePairwiseDistance = (hexColors: string[]): number => {
  if (hexColors.length < 2) return 0;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < hexColors.length; i++) {
    for (let j = i + 1; j < hexColors.length; j++) {
      sum += colorDistance(hexColors[i], hexColors[j]);
      cnt++;
    }
  }
  return cnt === 0 ? 0 : sum / cnt;
};

// sRGB -> XYZ -> Lab（D65）
const srgbToLinear = (c: number) => {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
};

const rgbToXyz = (r: number, g: number, b: number) => {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return { x: x * 100, y: y * 100, z: z * 100 };
};

const xyzToLab = (x: number, y: number, z: number) => {
  // D65 白点
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;
  let xr = x / Xn;
  let yr = y / Yn;
  let zr = z / Zn;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116);
  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);
  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
};

export const hexToLab = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
};

export const deltaE76 = (hexA: string, hexB: string): number => {
  const la = hexToLab(hexA);
  const lb = hexToLab(hexB);
  const dL = la.L - lb.L;
  const da = la.a - lb.a;
  const db = la.b - lb.b;
  return Math.sqrt(dL * dL + da * da + db * db);
};

// 基于阈值的多样性取样（空间距离 + 感知色差）- 性能优化版
export const generateDiverseColorSamples = (
  image: HTMLImageElement,
  count: number,
  imageWidth: number,
  imageHeight: number,
  opts?: {
    minDeltaE?: number; // 最小 Lab 色差阈值
    minPixelDistance?: number; // 取样点间最小像素距离
    attemptsPerPoint?: number; // 每个点最大尝试次数
    margin?: number; // 边缘留白像素
  }
): Array<Omit<ColorPoint, 'id'>> => {
  const minDeltaEInit = opts?.minDeltaE ?? 18; // ~可感知差异阈值
  const minDist = opts?.minPixelDistance ?? 24;
  const attemptsPerPoint = Math.min(opts?.attemptsPerPoint ?? 80, 100); // 限制最大尝试次数
  const margin = opts?.margin ?? 16;

  const selected: Array<Omit<ColorPoint, 'id'>> = [];
  const labs: Array<{ L: number; a: number; b: number }> = [];
  const positions: Array<{ x: number; y: number }> = [];

  const width = Math.max(1, imageWidth);
  const height = Math.max(1, imageHeight);

  // 预计算网格以提高性能
  const gridSize = Math.max(20, minDist);
  const gridCols = Math.ceil(width / gridSize);
  const gridRows = Math.ceil(height / gridSize);
  const grid: boolean[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(false));

  for (let i = 0; i < count; i++) {
    let bestCandidate: Omit<ColorPoint, 'id'> | null = null;
    let bestScore = -Infinity;
    let threshold = minDeltaEInit;
    let found = false;

    for (let t = 0; t < attemptsPerPoint; t++) {
      const x = Math.random() * (width - margin * 2) + margin;
      const y = Math.random() * (height - margin * 2) + margin;

      // 使用网格快速检查空间距离
      const gridX = Math.floor(x / gridSize);
      const gridY = Math.floor(y / gridSize);
      
      if (gridX < 0 || gridX >= gridCols || gridY < 0 || gridY >= gridRows) continue;
      if (grid[gridY][gridX]) continue; // 网格已被占用

      // 检查周围网格
      let okDist = true;
      const checkRadius = Math.ceil(minDist / gridSize);
      for (let dy = -checkRadius; dy <= checkRadius && okDist; dy++) {
        for (let dx = -checkRadius; dx <= checkRadius && okDist; dx++) {
          const checkX = gridX + dx;
          const checkY = gridY + dy;
          if (checkX >= 0 && checkX < gridCols && checkY >= 0 && checkY < gridRows) {
            if (grid[checkY][checkX]) {
              const actualDistance = Math.sqrt(dx * dx + dy * dy) * gridSize;
              if (actualDistance < minDist) {
                okDist = false;
                break;
              }
            }
          }
        }
      }
      
      if (!okDist) continue;

      const { color, hex } = getColorFromImage(image, x, y);
      const lab = hexToLab(hex);

      // 与已选的最小色差作为评分（只检查最近的几个点）
      let minDE = Infinity;
      const checkCount = Math.min(labs.length, 3); // 只检查最近的3个点
      for (let j = Math.max(0, labs.length - checkCount); j < labs.length; j++) {
        const l = labs[j];
        const dL = l.L - lab.L; const da = l.a - lab.a; const db = l.b - lab.b;
        const de = Math.sqrt(dL * dL + da * da + db * db);
        if (de < minDE) minDE = de;
      }
      if (labs.length === 0) minDE = 1e9; // 第一个点无需限制

      if (minDE >= threshold) {
        selected.push({ x, y, color, hex });
        labs.push(lab);
        positions.push({ x, y });
        // 标记网格为已占用
        if (gridX >= 0 && gridX < gridCols && gridY >= 0 && gridY < gridRows) {
          grid[gridY][gridX] = true;
        }
        found = true;
        break;
      }

      if (minDE > bestScore) {
        bestScore = minDE;
        bestCandidate = { x, y, color, hex };
      }

      // 更频繁地放宽阈值
      if (t > 0 && t % 20 === 0) {
        threshold *= 0.9;
      }
    }

    if (!found) {
      if (bestCandidate) {
        selected.push(bestCandidate);
        labs.push(hexToLab(bestCandidate.hex));
        positions.push({ x: bestCandidate.x, y: bestCandidate.y });
        // 标记网格
        const gridX = Math.floor(bestCandidate.x / gridSize);
        const gridY = Math.floor(bestCandidate.y / gridSize);
        if (gridX >= 0 && gridX < gridCols && gridY >= 0 && gridY < gridRows) {
          grid[gridY][gridX] = true;
        }
      } else {
        // 极端情况下，随便补一个
        const rx = Math.random() * (width - margin * 2) + margin;
        const ry = Math.random() * (height - margin * 2) + margin;
        const { color, hex } = getColorFromImage(image, rx, ry);
        selected.push({ x: rx, y: ry, color, hex });
        labs.push(hexToLab(hex));
        positions.push({ x: rx, y: ry });
      }
    }
  }

  return selected;
};

// 颜色匹配相关函数
// 使用现有的hexToRgb函数，但转换为数组格式用于LAB计算
function hexToRgbArray(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return [rgb.r, rgb.g, rgb.b] as [number, number, number];
}

// RGB (0-255) 转 LAB
function rgbToLab([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;
  
  const l = (116 * y) - 16;
  const a = 500 * (x - y);
  const b_lab = 200 * (y - z);
  return [l, a, b_lab];
}

// 计算 Delta E (CIE76)
function deltaE(lab1: [number, number, number], lab2: [number, number, number]): number {
  const [l1, a1, b1] = lab1;
  const [l2, a2, b2] = lab2;
  return Math.sqrt(Math.pow(l1 - l2, 2) + Math.pow(a1 - a2, 2) + Math.pow(b1 - b2, 2));
}

// 色库数据（这里先定义结构，用户后续会补充具体数据）
export const colorLibrary: Array<{ID: number, HEX: string}> = [
  { "ID": 1, "HEX": "#060739" }, { "ID": 2, "HEX": "#080b05" }, { "ID": 3, "HEX": "#082512" }, { "ID": 4, "HEX": "#083008" }, { "ID": 5, "HEX": "#0f0a1a" },
  { "ID": 6, "HEX": "#122727" }, { "ID": 7, "HEX": "#122737" }, { "ID": 8, "HEX": "#124008" }, { "ID": 9, "HEX": "#130827" }, { "ID": 10, "HEX": "#136747" },
  { "ID": 11, "HEX": "#150a57" }, { "ID": 12, "HEX": "#156714" }, { "ID": 13, "HEX": "#162a6a" }, { "ID": 14, "HEX": "#17048b" }, { "ID": 15, "HEX": "#182959" },
  { "ID": 16, "HEX": "#183959" }, { "ID": 17, "HEX": "#184929" }, { "ID": 18, "HEX": "#184939" }, { "ID": 19, "HEX": "#184949" }, { "ID": 20, "HEX": "#184959" },
  { "ID": 21, "HEX": "#184979" }, { "ID": 22, "HEX": "#186929" }, { "ID": 23, "HEX": "#187979" }, { "ID": 24, "HEX": "#199383" }, { "ID": 25, "HEX": "#1a8c0f" },
  { "ID": 26, "HEX": "#1c0779" }, { "ID": 27, "HEX": "#1c5727" }, { "ID": 28, "HEX": "#1c5777" }, { "ID": 29, "HEX": "#1c606f" }, { "ID": 30, "HEX": "#1c7747" },
  { "ID": 31, "HEX": "#1c8738" }, { "ID": 32, "HEX": "#1ca008" }, { "ID": 33, "HEX": "#1e510b" }, { "ID": 34, "HEX": "#1ec320" }, { "ID": 35, "HEX": "#1f050b" },
  { "ID": 36, "HEX": "#1f2343" }, { "ID": 37, "HEX": "#1f5999" }, { "ID": 38, "HEX": "#1f8999" }, { "ID": 39, "HEX": "#1fa92a" }, { "ID": 40, "HEX": "#1fa979" },
  { "ID": 41, "HEX": "#206f5f" }, { "ID": 42, "HEX": "#212878" }, { "ID": 43, "HEX": "#212888" }, { "ID": 44, "HEX": "#2229a8" }, { "ID": 45, "HEX": "#224898" },
  { "ID": 46, "HEX": "#2248c8" }, { "ID": 47, "HEX": "#2258b8" }, { "ID": 48, "HEX": "#226898" }, { "ID": 49, "HEX": "#228848" }, { "ID": 50, "HEX": "#229898" },
  { "ID": 51, "HEX": "#230fd3" }, { "ID": 52, "HEX": "#2312b5" }, { "ID": 53, "HEX": "#242715" }, { "ID": 54, "HEX": "#250b3a" }, { "ID": 55, "HEX": "#2612c5" },
  { "ID": 56, "HEX": "#2612e5" }, { "ID": 57, "HEX": "#262897" }, { "ID": 58, "HEX": "#2640b0" }, { "ID": 59, "HEX": "#26841e" }, { "ID": 60, "HEX": "#268e6e" },
  { "ID": 61, "HEX": "#26d012" }, { "ID": 62, "HEX": "#270849" }, { "ID": 63, "HEX": "#273aca" }, { "ID": 64, "HEX": "#279a3a" }, { "ID": 65, "HEX": "#27e626" },
  { "ID": 66, "HEX": "#2808a1" }, { "ID": 67, "HEX": "#28750a" }, { "ID": 68, "HEX": "#2879b9" }, { "ID": 69, "HEX": "#28b949" }, { "ID": 70, "HEX": "#2956c6" },
  { "ID": 71, "HEX": "#2979d9" }, { "ID": 72, "HEX": "#29c999" }, { "ID": 73, "HEX": "#29e979" }, { "ID": 74, "HEX": "#2a096d" }, { "ID": 75, "HEX": "#2aa0c0" },
  { "ID": 76, "HEX": "#2b07f0" }, { "ID": 77, "HEX": "#2b42a2" }, { "ID": 78, "HEX": "#2b4484" }, { "ID": 79, "HEX": "#2b6464" }, { "ID": 80, "HEX": "#2b68e8" },
  { "ID": 81, "HEX": "#2b7484" }, { "ID": 82, "HEX": "#2b7898" }, { "ID": 83, "HEX": "#2b88b8" }, { "ID": 84, "HEX": "#2b9464" }, { "ID": 85, "HEX": "#2ba858" },
  { "ID": 86, "HEX": "#2ba868" }, { "ID": 87, "HEX": "#2bb218" }, { "ID": 88, "HEX": "#2bb494" }, { "ID": 89, "HEX": "#2bb858" }, { "ID": 90, "HEX": "#2bb8c8" },
  { "ID": 91, "HEX": "#2bb8e8" }, { "ID": 92, "HEX": "#2bc878" }, { "ID": 93, "HEX": "#2bc8e8" }, { "ID": 94, "HEX": "#2be181" }, { "ID": 95, "HEX": "#2be868" },
  { "ID": 96, "HEX": "#2ceb57" }, { "ID": 97, "HEX": "#2d360e" }, { "ID": 98, "HEX": "#2f68b7" }, { "ID": 99, "HEX": "#2fa0af" }, { "ID": 100, "HEX": "#309aea" },
  { "ID": 101, "HEX": "#30aaea" }, { "ID": 102, "HEX": "#30c748" }, { "ID": 103, "HEX": "#30eaca" }, { "ID": 104, "HEX": "#30f012" }, { "ID": 105, "HEX": "#31a432" },
  { "ID": 106, "HEX": "#31b9a9" }, { "ID": 107, "HEX": "#3279e9" }, { "ID": 108, "HEX": "#32b9b9" }, { "ID": 109, "HEX": "#32e9d9" }, { "ID": 110, "HEX": "#33090a" },
  { "ID": 111, "HEX": "#33235f" }, { "ID": 112, "HEX": "#342014" }, { "ID": 113, "HEX": "#3525b5" }, { "ID": 114, "HEX": "#3538e8" }, { "ID": 115, "HEX": "#3558e8" },
  { "ID": 116, "HEX": "#35670b" }, { "ID": 117, "HEX": "#35d8e8" }, { "ID": 118, "HEX": "#35e898" }, { "ID": 119, "HEX": "#35e8a8" }, { "ID": 120, "HEX": "#35e8b8" },
  { "ID": 121, "HEX": "#35e8e8" }, { "ID": 122, "HEX": "#3641e0" }, { "ID": 123, "HEX": "#36cb8b" }, { "ID": 124, "HEX": "#36d363" }, { "ID": 125, "HEX": "#383847" },
  { "ID": 126, "HEX": "#3990ef" }, { "ID": 127, "HEX": "#39a0cf" }, { "ID": 128, "HEX": "#39d0cf" }, { "ID": 129, "HEX": "#3c1c2b" }, { "ID": 130, "HEX": "#3c2beb" },
  { "ID": 131, "HEX": "#3c85d5" }, { "ID": 132, "HEX": "#3cd545" }, { "ID": 133, "HEX": "#3d0d3a" }, { "ID": 134, "HEX": "#400926" }, { "ID": 135, "HEX": "#403d3d" },
  { "ID": 136, "HEX": "#404936" }, { "ID": 137, "HEX": "#406f4f" }, { "ID": 138, "HEX": "#4094d4" }, { "ID": 139, "HEX": "#41d3c3" }, { "ID": 140, "HEX": "#41d4b4" },
  { "ID": 141, "HEX": "#42e540" }, { "ID": 142, "HEX": "#434272" }, { "ID": 143, "HEX": "#440f91" }, { "ID": 144, "HEX": "#469b10" }, { "ID": 145, "HEX": "#484d0c" },
  { "ID": 146, "HEX": "#486857" }, { "ID": 147, "HEX": "#4a1163" }, { "ID": 148, "HEX": "#4b7535" }, { "ID": 149, "HEX": "#4c2f0b" }, { "ID": 150, "HEX": "#4c3f23" },
  { "ID": 151, "HEX": "#4d0c0b" }, { "ID": 152, "HEX": "#4d5969" }, { "ID": 153, "HEX": "#4d6611" }, { "ID": 154, "HEX": "#4e8785" }, { "ID": 155, "HEX": "#502d4d" },
  { "ID": 156, "HEX": "#504767" }, { "ID": 157, "HEX": "#506282" }, { "ID": 158, "HEX": "#507d4a" }, { "ID": 159, "HEX": "#508f40" }, { "ID": 160, "HEX": "#509f8f" },
  { "ID": 161, "HEX": "#50c720" }, { "ID": 162, "HEX": "#52622d" }, { "ID": 163, "HEX": "#534292" }, { "ID": 164, "HEX": "#5366d6" }, { "ID": 165, "HEX": "#540d4f" },
  { "ID": 166, "HEX": "#550b20" }, { "ID": 167, "HEX": "#55bf8b" }, { "ID": 168, "HEX": "#5749c9" }, { "ID": 169, "HEX": "#586565" }, { "ID": 170, "HEX": "#596faf" },
  { "ID": 171, "HEX": "#596fcf" }, { "ID": 172, "HEX": "#5a053a" }, { "ID": 173, "HEX": "#5b6d9d" }, { "ID": 174, "HEX": "#5c8116" }, { "ID": 175, "HEX": "#5d0fea" },
  { "ID": 176, "HEX": "#5d250e" }, { "ID": 177, "HEX": "#5d3d4d" }, { "ID": 178, "HEX": "#5d50af" }, { "ID": 179, "HEX": "#5d9979" }, { "ID": 180, "HEX": "#5e1b8c" },
  { "ID": 181, "HEX": "#5e9d2a" }, { "ID": 182, "HEX": "#600f74" }, { "ID": 183, "HEX": "#6012c5" }, { "ID": 184, "HEX": "#601cbb" }, { "ID": 185, "HEX": "#60305f" },
  { "ID": 186, "HEX": "#603292" }, { "ID": 187, "HEX": "#6035b2" }, { "ID": 188, "HEX": "#603827" }, { "ID": 189, "HEX": "#603d7d" }, { "ID": 190, "HEX": "#604912" },
  { "ID": 191, "HEX": "#605797" }, { "ID": 192, "HEX": "#605f42" }, { "ID": 193, "HEX": "#608f9f" }, { "ID": 194, "HEX": "#60a7a7" }, { "ID": 195, "HEX": "#60b318" },
  { "ID": 196, "HEX": "#60dc19" }, { "ID": 197, "HEX": "#620fd3" }, { "ID": 198, "HEX": "#623234" }, { "ID": 199, "HEX": "#62e264" }, { "ID": 200, "HEX": "#6312a4" },
  { "ID": 201, "HEX": "#63b538" }, { "ID": 202, "HEX": "#641537" }, { "ID": 203, "HEX": "#649210" }, { "ID": 204, "HEX": "#64d773" }, { "ID": 205, "HEX": "#65a272" },
  { "ID": 206, "HEX": "#65a4c4" }, { "ID": 207, "HEX": "#660c0c" }, { "ID": 208, "HEX": "#67c979" }, { "ID": 209, "HEX": "#6867e7" }, { "ID": 210, "HEX": "#68b7e7" },
  { "ID": 211, "HEX": "#69b9c6" }, { "ID": 212, "HEX": "#6a7686" }, { "ID": 213, "HEX": "#6bbf57" }, { "ID": 214, "HEX": "#6c3f09" }, { "ID": 215, "HEX": "#6c5f8f" },
  { "ID": 216, "HEX": "#6c6111" }, { "ID": 217, "HEX": "#6c8fc1" }, { "ID": 218, "HEX": "#6cad6d" }, { "ID": 219, "HEX": "#6cc31b" }, { "ID": 220, "HEX": "#6cc6e6" },
  { "ID": 221, "HEX": "#6d79c9" }, { "ID": 222, "HEX": "#6da245" }, { "ID": 223, "HEX": "#6e4cbc" }, { "ID": 224, "HEX": "#701669" }, { "ID": 225, "HEX": "#705a57" },
  { "ID": 226, "HEX": "#70780f" }, { "ID": 227, "HEX": "#708262" }, { "ID": 228, "HEX": "#708737" }, { "ID": 229, "HEX": "#708787" }, { "ID": 230, "HEX": "#70bf8f" },
  { "ID": 231, "HEX": "#70f01c" }, { "ID": 232, "HEX": "#720f95" }, { "ID": 233, "HEX": "#738f5d" }, { "ID": 234, "HEX": "#7452e1" }, { "ID": 235, "HEX": "#748faf" },
  { "ID": 236, "HEX": "#759381" }, { "ID": 237, "HEX": "#75a60e" }, { "ID": 238, "HEX": "#75f089" }, { "ID": 239, "HEX": "#7838e7" }, { "ID": 240, "HEX": "#78408f" },
  { "ID": 241, "HEX": "#7860af" }, { "ID": 242, "HEX": "#78e7b7" }, { "ID": 243, "HEX": "#791059" }, { "ID": 244, "HEX": "#79be9e" }, { "ID": 245, "HEX": "#7a0e85" },
  { "ID": 246, "HEX": "#7aea4e" }, { "ID": 247, "HEX": "#7b2332" }, { "ID": 248, "HEX": "#7bbd6d" }, { "ID": 249, "HEX": "#7be1e1" }, { "ID": 250, "HEX": "#7c204f" },
  { "ID": 251, "HEX": "#7c5683" }, { "ID": 252, "HEX": "#7c7363" }, { "ID": 253, "HEX": "#7cd51a" }, { "ID": 254, "HEX": "#7d7f46" }, { "ID": 255, "HEX": "#7f18eb" },
  { "ID": 256, "HEX": "#7f2e06" }, { "ID": 257, "HEX": "#7fe89a" }, { "ID": 258, "HEX": "#80425f" }, { "ID": 259, "HEX": "#8044e4" }, { "ID": 260, "HEX": "#805632" },
  { "ID": 261, "HEX": "#81110c" }, { "ID": 262, "HEX": "#81d8e7" }, { "ID": 263, "HEX": "#8237c2" }, { "ID": 264, "HEX": "#825e71" }, { "ID": 265, "HEX": "#82d94d" },
  { "ID": 266, "HEX": "#82e5c5" }, { "ID": 267, "HEX": "#830b29" }, { "ID": 268, "HEX": "#832923" }, { "ID": 269, "HEX": "#8362c2" }, { "ID": 270, "HEX": "#8386c6" },
  { "ID": 271, "HEX": "#844082" }, { "ID": 272, "HEX": "#845a0f" }, { "ID": 273, "HEX": "#84e1a1" }, { "ID": 274, "HEX": "#856f45" }, { "ID": 275, "HEX": "#857591" },
  { "ID": 276, "HEX": "#8579e9" }, { "ID": 277, "HEX": "#8589e9" }, { "ID": 278, "HEX": "#8599e9" }, { "ID": 279, "HEX": "#85a9e9" }, { "ID": 280, "HEX": "#85c3b6" },
  { "ID": 281, "HEX": "#865c4c" }, { "ID": 282, "HEX": "#86e5d5" }, { "ID": 283, "HEX": "#8711c8" }, { "ID": 284, "HEX": "#883897" }, { "ID": 285, "HEX": "#884124" },
  { "ID": 286, "HEX": "#8a16b1" }, { "ID": 287, "HEX": "#8a1744" }, { "ID": 288, "HEX": "#8b9d3c" }, { "ID": 289, "HEX": "#8be96d" }, { "ID": 290, "HEX": "#8cb13b" },
  { "ID": 291, "HEX": "#8cc51c" }, { "ID": 292, "HEX": "#8d6f11" }, { "ID": 293, "HEX": "#8d9f62" }, { "ID": 294, "HEX": "#8dca68" }, { "ID": 295, "HEX": "#8e167b" },
  { "ID": 296, "HEX": "#9060df" }, { "ID": 297, "HEX": "#906dab" }, { "ID": 298, "HEX": "#90afad" }, { "ID": 299, "HEX": "#90b2c2" }, { "ID": 300, "HEX": "#90c740" },
  { "ID": 301, "HEX": "#91910e" }, { "ID": 302, "HEX": "#922d9f" }, { "ID": 303, "HEX": "#92454a" }, { "ID": 304, "HEX": "#924d0e" }, { "ID": 305, "HEX": "#928a35" },
  { "ID": 306, "HEX": "#928fbd" }, { "ID": 307, "HEX": "#92b25d" }, { "ID": 308, "HEX": "#92ea17" }, { "ID": 309, "HEX": "#934c7c" }, { "ID": 310, "HEX": "#936363" },
  { "ID": 311, "HEX": "#93d6a6" }, { "ID": 312, "HEX": "#947f0f" }, { "ID": 313, "HEX": "#9720e5" }, { "ID": 314, "HEX": "#98918d" }, { "ID": 315, "HEX": "#98a919" },
  { "ID": 316, "HEX": "#98b8e7" }, { "ID": 317, "HEX": "#997f42" }, { "ID": 318, "HEX": "#9b347f" }, { "ID": 319, "HEX": "#9b9bab" }, { "ID": 320, "HEX": "#9ccceb" },
  { "ID": 321, "HEX": "#9d1a64" }, { "ID": 322, "HEX": "#9d38e2" }, { "ID": 323, "HEX": "#9d5dcd" }, { "ID": 324, "HEX": "#9ee840" }, { "ID": 325, "HEX": "#a00ea6" },
  { "ID": 326, "HEX": "#a05669" }, { "ID": 327, "HEX": "#a05946" }, { "ID": 328, "HEX": "#a08f6f" }, { "ID": 329, "HEX": "#a0d519" }, { "ID": 330, "HEX": "#a0e780" },
  { "ID": 331, "HEX": "#a10e09" }, { "ID": 332, "HEX": "#a11320" }, { "ID": 333, "HEX": "#a13004" }, { "ID": 334, "HEX": "#a252b2" }, { "ID": 335, "HEX": "#a252e4" },
  { "ID": 336, "HEX": "#a28275" }, { "ID": 337, "HEX": "#a3bf22" }, { "ID": 338, "HEX": "#a481d1" }, { "ID": 339, "HEX": "#a4b395" }, { "ID": 340, "HEX": "#a4bf8f" },
  { "ID": 341, "HEX": "#a4d494" }, { "ID": 342, "HEX": "#a543c1" }, { "ID": 343, "HEX": "#a610ed" }, { "ID": 344, "HEX": "#a90e59" }, { "ID": 345, "HEX": "#aa15bf" },
  { "ID": 346, "HEX": "#aa19d3" }, { "ID": 347, "HEX": "#aa423f" }, { "ID": 348, "HEX": "#aaea17" }, { "ID": 349, "HEX": "#ab5024" }, { "ID": 350, "HEX": "#ac1b8d" },
  { "ID": 351, "HEX": "#ac1c45" }, { "ID": 352, "HEX": "#ac22a1" }, { "ID": 353, "HEX": "#ac7317" }, { "ID": 354, "HEX": "#ae3e65" }, { "ID": 355, "HEX": "#ae753e" },
  { "ID": 356, "HEX": "#ae7e91" }, { "ID": 357, "HEX": "#afaf17" }, { "ID": 358, "HEX": "#b02036" }, { "ID": 359, "HEX": "#b0609d" }, { "ID": 360, "HEX": "#b0af3d" },
  { "ID": 361, "HEX": "#b0bd7b" }, { "ID": 362, "HEX": "#b0bedc" }, { "ID": 363, "HEX": "#b0df8f" }, { "ID": 364, "HEX": "#b0e760" }, { "ID": 365, "HEX": "#b1137a" },
  { "ID": 366, "HEX": "#b1a16e" }, { "ID": 367, "HEX": "#b1aa53" }, { "ID": 368, "HEX": "#b26217" }, { "ID": 369, "HEX": "#b2785d" }, { "ID": 370, "HEX": "#b28d3a" },
  { "ID": 371, "HEX": "#b29dbb" }, { "ID": 372, "HEX": "#b2a0e3" }, { "ID": 373, "HEX": "#b381b6" }, { "ID": 374, "HEX": "#b3e1c3" }, { "ID": 375, "HEX": "#b3edb8" },
  { "ID": 376, "HEX": "#b440df" }, { "ID": 377, "HEX": "#b462b1" }, { "ID": 378, "HEX": "#b482e1" }, { "ID": 379, "HEX": "#b4ece7" }, { "ID": 380, "HEX": "#b7cbb9" },
  { "ID": 381, "HEX": "#b83e27" }, { "ID": 382, "HEX": "#b8d8e7" }, { "ID": 383, "HEX": "#b9d6d6" }, { "ID": 384, "HEX": "#ba9b28" }, { "ID": 385, "HEX": "#baea17" },
  { "ID": 386, "HEX": "#bbcf1d" }, { "ID": 387, "HEX": "#bc4c10" }, { "ID": 388, "HEX": "#bc69e9" }, { "ID": 389, "HEX": "#bc6c8c" }, { "ID": 390, "HEX": "#bc79e9" },
  { "ID": 391, "HEX": "#bca918" }, { "ID": 392, "HEX": "#bce16e" }, { "ID": 393, "HEX": "#bce383" }, { "ID": 394, "HEX": "#be2003" }, { "ID": 395, "HEX": "#be5187" },
  { "ID": 396, "HEX": "#c01e5f" }, { "ID": 397, "HEX": "#c06d6b" }, { "ID": 398, "HEX": "#c0908d" }, { "ID": 399, "HEX": "#c0ad9b" }, { "ID": 400, "HEX": "#c0afdf" },
  { "ID": 401, "HEX": "#c0bdbd" }, { "ID": 402, "HEX": "#c0c962" }, { "ID": 403, "HEX": "#c0cd4b" }, { "ID": 404, "HEX": "#c113ea" }, { "ID": 405, "HEX": "#c1890e" },
  { "ID": 406, "HEX": "#c24cad" }, { "ID": 407, "HEX": "#c25063" }, { "ID": 408, "HEX": "#c26d4a" }, { "ID": 409, "HEX": "#c432bf" }, { "ID": 410, "HEX": "#c6e948" },
  { "ID": 411, "HEX": "#c8154e" }, { "ID": 412, "HEX": "#c823de" }, { "ID": 413, "HEX": "#c9181e" }, { "ID": 414, "HEX": "#c91f93" }, { "ID": 415, "HEX": "#ca1934" },
  { "ID": 416, "HEX": "#cb1776" }, { "ID": 417, "HEX": "#cb448f" }, { "ID": 418, "HEX": "#cb7017" }, { "ID": 419, "HEX": "#cc19a9" }, { "ID": 420, "HEX": "#ccb9c9" },
  { "ID": 421, "HEX": "#cccc23" }, { "ID": 422, "HEX": "#cd59e9" }, { "ID": 423, "HEX": "#ce9b60" }, { "ID": 424, "HEX": "#cee71e" }, { "ID": 425, "HEX": "#d0604d" },
  { "ID": 426, "HEX": "#d0e9b6" }, { "ID": 427, "HEX": "#d217c9" }, { "ID": 428, "HEX": "#d2423b" }, { "ID": 429, "HEX": "#d2983d" }, { "ID": 430, "HEX": "#d371d7" },
  { "ID": 431, "HEX": "#d494b4" }, { "ID": 432, "HEX": "#d5a185" }, { "ID": 433, "HEX": "#d66318" }, { "ID": 434, "HEX": "#d6e292" }, { "ID": 435, "HEX": "#d74455" },
  { "ID": 436, "HEX": "#d81611" }, { "ID": 437, "HEX": "#d94e1e" }, { "ID": 438, "HEX": "#d9a4e6" }, { "ID": 439, "HEX": "#dbcd9b" }, { "ID": 440, "HEX": "#dcb92b" },
  { "ID": 441, "HEX": "#de80ba" }, { "ID": 442, "HEX": "#de8ee1" }, { "ID": 443, "HEX": "#deebd7" }, { "ID": 444, "HEX": "#e0214f" }, { "ID": 445, "HEX": "#e050c2" },
  { "ID": 446, "HEX": "#e0b35c" }, { "ID": 447, "HEX": "#e0bc83" }, { "ID": 448, "HEX": "#e0d7bf" }, { "ID": 449, "HEX": "#e0e780" }, { "ID": 450, "HEX": "#e12171" },
  { "ID": 451, "HEX": "#e14871" }, { "ID": 452, "HEX": "#e1718c" }, { "ID": 453, "HEX": "#e18573" }, { "ID": 454, "HEX": "#e1c0e3" }, { "ID": 455, "HEX": "#e242a9" },
  { "ID": 456, "HEX": "#e28054" }, { "ID": 457, "HEX": "#e290a1" }, { "ID": 458, "HEX": "#e2ab3a" }, { "ID": 459, "HEX": "#e2cd1e" }, { "ID": 460, "HEX": "#e2e3a7" },
  { "ID": 461, "HEX": "#e38e47" }, { "ID": 462, "HEX": "#e3a1d1" }, { "ID": 463, "HEX": "#e3b3ba" }, { "ID": 464, "HEX": "#e3ce55" }, { "ID": 465, "HEX": "#e3ce77" },
  { "ID": 466, "HEX": "#e3d6e6" }, { "ID": 467, "HEX": "#e442e7" }, { "ID": 468, "HEX": "#e4448b" }, { "ID": 469, "HEX": "#e4c1a7" }, { "ID": 470, "HEX": "#e5a513" },
  { "ID": 471, "HEX": "#e5e85c" }, { "ID": 472, "HEX": "#e619f0" }, { "ID": 473, "HEX": "#e67c10" }, { "ID": 474, "HEX": "#e6911f" }, { "ID": 475, "HEX": "#e69c93" },
  { "ID": 476, "HEX": "#e69f6f" }, { "ID": 477, "HEX": "#e7696e" }, { "ID": 478, "HEX": "#e769be" }, { "ID": 479, "HEX": "#e81f9a" }, { "ID": 480, "HEX": "#e820af" },
  { "ID": 481, "HEX": "#e8610c" }, { "ID": 482, "HEX": "#e870e7" }, { "ID": 483, "HEX": "#e8bc13" }, { "ID": 484, "HEX": "#e8f012" }, { "ID": 485, "HEX": "#e91849" },
  { "ID": 486, "HEX": "#e91987" }, { "ID": 487, "HEX": "#e93e29" }, { "ID": 488, "HEX": "#e9dcdc" }, { "ID": 489, "HEX": "#e9e323" }, { "ID": 490, "HEX": "#ea1ce1" },
  { "ID": 491, "HEX": "#ea4345" }, { "ID": 492, "HEX": "#ea440b" }, { "ID": 493, "HEX": "#ea50d9" }, { "ID": 494, "HEX": "#ea6a4a" }, { "ID": 495, "HEX": "#ea6a9f" },
  { "ID": 496, "HEX": "#eb1736" }, { "ID": 497, "HEX": "#eb1766" }, { "ID": 498, "HEX": "#eb17c6" }, { "ID": 499, "HEX": "#ec1a0e" }, { "ID": 500, "HEX": "#ec7834" },
  { "ID": 501, "HEX": "#FFFFFF" }, { "ID": 502, "HEX": "#000000" }
];

// 预处理色库，转换为LAB空间以提高性能
let labColorLibrary: Array<{id: number, hex: string, lab: [number, number, number]}> = [];

export function preprocessLibrary() {
  labColorLibrary = colorLibrary.map(color => {
    const rgb = hexToRgbArray(color.HEX);
    if (rgb) {
      return {
        id: color.ID,
        hex: color.HEX,
        lab: rgbToLab(rgb)
      };
    }
    return null;
  }).filter(Boolean) as Array<{id: number, hex: string, lab: [number, number, number]}>;
}

// 查找最接近的颜色
export function findClosestColor(targetHex: string): {id: number, hex: string, lab: [number, number, number]} | null {
  if (labColorLibrary.length === 0) {
    preprocessLibrary();
  }
  
  const targetRgb = hexToRgbArray(targetHex);
  if (!targetRgb) return null;
  const targetLab = rgbToLab(targetRgb);

  let minDistance = Infinity;
  let closestMatch: {id: number, hex: string, lab: [number, number, number]} | null = null;

  for (const libColor of labColorLibrary) {
    const distance = deltaE(targetLab, libColor.lab);
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = libColor;
    }
  }
  return closestMatch;
}

// 匹配调色板中的所有颜色 - 性能优化版
export function matchColorPalette(hexColors: string[]): {matches: Array<{originalHex: string, matchedHex: string, matchedId: number, distance: number}>, idArray: number[]} {
  const matches: Array<{originalHex: string, matchedHex: string, matchedId: number, distance: number}> = [];
  const idArray: number[] = [];

  // 预处理所有目标颜色为LAB空间，避免重复转换
  const targetLabs: Array<[number, number, number] | null> = [];
  for (const hex of hexColors) {
    const targetRgb = hexToRgbArray(hex);
    const targetLab = targetRgb ? rgbToLab(targetRgb) : null;
    targetLabs.push(targetLab);
  }

  // 批量匹配
  for (let i = 0; i < hexColors.length; i++) {
    const hex = hexColors[i];
    const targetLab = targetLabs[i];
    
    if (!targetLab) continue;
    
    const match = findClosestColor(hex);
    if (match) {
      const distance = deltaE(targetLab, match.lab);
      
      matches.push({
        originalHex: hex,
        matchedHex: match.hex,
        matchedId: match.id,
        distance: distance
      });
      idArray.push(match.id);
    }
  }

  return { matches, idArray };
}
