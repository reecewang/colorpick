export interface ColorPoint {
  id: number;
  x: number;
  y: number;
  color: string;
  hex: string;
}

export interface PaletteItem {
  id: number;
  color: string;
  hex: string;
}

export interface ImageData {
  file: File;
  url: string;
  name: string;
}

// 颜色匹配相关类型
export interface ColorMatch {
  originalHex: string;
  matchedHex: string;
  matchedId: number;
  distance: number;
}

export interface ColorMatchResult {
  matches: ColorMatch[];
  idArray: number[];
}
