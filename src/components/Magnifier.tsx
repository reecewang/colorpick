import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { ColorPoint } from '../types';

interface MagnifierProps {
  imageRef: React.RefObject<HTMLImageElement>;
  selectedPoint: ColorPoint | null;
  size?: number; // 画布尺寸（px）
  gridSize?: number; // 采样网格尺寸（奇数）
  imageKey?: string; // 图片源标识（用于触发缓存重建）
}

const Magnifier: React.FC<MagnifierProps> = ({ 
  imageRef, 
  selectedPoint, 
  size = 160, // 移动端默认更小
  gridSize = 15, 
  imageKey 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastImageSrcRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastDrawTimeRef = useRef<number>(0);

  const normalizedGrid = useMemo(() => {
    return gridSize % 2 === 0 ? gridSize + 1 : gridSize; // 强制为奇数
  }, [gridSize]);

  // 初始化画布尺寸（仅在挂载或 size 改变时）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
  }, [size]);

  // 构建/更新离屏画布缓存（当图片源变化或尺寸变化时）
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    // 若外部传入 imageKey 变化，主动清空旧缓存
    if (imageKey && lastImageSrcRef.current !== imageKey) {
      offscreenRef.current = null;
      offscreenCtxRef.current = null;
      lastImageSrcRef.current = null;
    }

    const currentSrc = (image as HTMLImageElement).currentSrc || image.src;

    const buildOffscreen = () => {
      const natW = image.naturalWidth;
      const natH = image.naturalHeight;
      if (!natW || !natH) return;
      const off = document.createElement('canvas');
      off.width = natW;
      off.height = natH;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, natW, natH);
      offscreenRef.current = off;
      offscreenCtxRef.current = ctx;
      lastImageSrcRef.current = imageKey || currentSrc;
    };

    if (lastImageSrcRef.current !== (imageKey || currentSrc)) {
      if (image.complete) {
        buildOffscreen();
      } else {
        const onload = () => buildOffscreen();
        image.addEventListener('load', onload, { once: true });
        return () => image.removeEventListener('load', onload);
      }
    }
  }, [imageRef, imageKey]);

  // 高性能绘制函数
  const drawMagnifier = useCallback(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    const offCtx = offscreenCtxRef.current;
    if (!canvas || !image || !selectedPoint) return;

    const now = performance.now();
    
    // 检查点是否真的改变了
    const currentPoint = { x: selectedPoint.x, y: selectedPoint.y };
    if (lastPointRef.current && 
        Math.abs(lastPointRef.current.x - currentPoint.x) < 0.5 && 
        Math.abs(lastPointRef.current.y - currentPoint.y) < 0.5) {
      return; // 点移动很小，跳过重绘
    }

    // 拖拽时提高绘制频率，确保实时性
    const minInterval = isDraggingRef.current ? 4 : 8; // 拖拽时约240fps，静止时120fps
    if (now - lastDrawTimeRef.current < minInterval) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawMagnifier);
      return;
    }

    lastPointRef.current = currentPoint;
    lastDrawTimeRef.current = now;

    const displayCtx = canvas.getContext('2d');
    if (!displayCtx) return;

    const scrollerW = image.offsetWidth || 1;
    const scrollerH = image.offsetHeight || 1;
    if (scrollerW <= 1 || scrollerH <= 1) return;

    const natW = (offscreenRef.current?.width || image.naturalWidth || 1);
    const natH = (offscreenRef.current?.height || image.naturalHeight || 1);
    const centerX = Math.floor((selectedPoint.x / scrollerW) * natW);
    const centerY = Math.floor((selectedPoint.y / scrollerH) * natH);
    const radius = Math.floor(normalizedGrid / 2);
    let startX = centerX - radius;
    let startY = centerY - radius;
    if (startX < 0) startX = 0;
    if (startY < 0) startY = 0;
    if (startX + normalizedGrid > natW) startX = Math.max(0, natW - normalizedGrid);
    if (startY + normalizedGrid > natH) startY = Math.max(0, natH - normalizedGrid);

    let patch: ImageData | null = null;
    if (offCtx && offscreenRef.current) {
      patch = offCtx.getImageData(startX, startY, Math.min(normalizedGrid, natW), Math.min(normalizedGrid, natH));
    } else if (image.complete && image.naturalWidth && image.naturalHeight) {
      const scratch = document.createElement('canvas');
      scratch.width = Math.min(normalizedGrid, natW);
      scratch.height = Math.min(normalizedGrid, natH);
      const sctx = scratch.getContext('2d');
      if (sctx) {
        sctx.drawImage(
          image,
          startX,
          startY,
          scratch.width,
          scratch.height,
          0,
          0,
          scratch.width,
          scratch.height
        );
        patch = sctx.getImageData(0, 0, scratch.width, scratch.height);
      }
    }

    if (!patch) return;

    // 使用更高效的绘制方法
    displayCtx.clearRect(0, 0, size, size);
    const cell = size / normalizedGrid;

    // 批量绘制像素，减少状态切换
    const imageData = displayCtx.createImageData(size, size);
    const data = imageData.data;

    for (let gy = 0; gy < patch.height; gy++) {
      for (let gx = 0; gx < patch.width; gx++) {
        const patchIdx = (gy * patch.width + gx) * 4;

        
        const r = patch.data[patchIdx];
        const g = patch.data[patchIdx + 1];
        const b = patch.data[patchIdx + 2];
        
        // 填充整个像素块
        const cellSize = Math.ceil(cell);
        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const y = Math.floor(gy * cell) + dy;
            const x = Math.floor(gx * cell) + dx;
            if (y < size && x < size) {
              const idx = (y * size + x) * 4;
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = 255;
            }
          }
        }
      }
    }

    // 一次性绘制所有像素
    displayCtx.putImageData(imageData, 0, 0);

    // 绘制网格线（优化版）
    displayCtx.strokeStyle = 'rgba(255,255,255,0.35)';
    displayCtx.lineWidth = 1;
    displayCtx.beginPath();
    
    // 批量绘制网格线
    for (let i = 0; i <= normalizedGrid; i++) {
      const p = Math.floor(i * cell) + 0.5;
      displayCtx.moveTo(0, p);
      displayCtx.lineTo(size, p);
      displayCtx.moveTo(p, 0);
      displayCtx.lineTo(p, size);
    }
    displayCtx.stroke();

    // 绘制十字准星
    const cx = (centerX - startX) * cell + cell / 2;
    const cy = (centerY - startY) * cell + cell / 2;
    displayCtx.strokeStyle = 'rgba(0,0,0,0.8)';
    displayCtx.lineWidth = 2;
    displayCtx.beginPath();
    displayCtx.moveTo(cx - cell, cy);
    displayCtx.lineTo(cx + cell, cy);
    displayCtx.moveTo(cx, cy - cell);
    displayCtx.lineTo(cx, cy + cell);
    displayCtx.stroke();

    // 绘制边框
    displayCtx.strokeStyle = 'rgba(0,0,0,0.6)';
    displayCtx.lineWidth = 2;
    displayCtx.strokeRect(1, 1, size - 2, size - 2);
  }, [imageRef, selectedPoint, size, normalizedGrid]);

  // 优化的绘制效果（实时响应）
  useEffect(() => {
    if (!selectedPoint) {
      // 没有选中点时清空画布
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
        }
      }
      lastPointRef.current = null;
      isDraggingRef.current = false;
      return;
    }

    // 检测是否正在拖拽
    const checkDragging = () => {
      if (lastPointRef.current) {
        const dx = Math.abs(selectedPoint.x - lastPointRef.current.x);
        const dy = Math.abs(selectedPoint.y - lastPointRef.current.y);
        isDraggingRef.current = dx > 0.5 || dy > 0.5;
      }
    };

    // 立即绘制，不使用防抖
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      checkDragging();
      drawMagnifier();
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [selectedPoint, drawMagnifier, size]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow mb-3 p-3 w-[232px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-600">放大镜</span>
        <span className="text-xs text-gray-500">{normalizedGrid}×{normalizedGrid}</span>
      </div>
      <canvas ref={canvasRef} className="rounded border border-gray-200 block" style={{ width: `${size}px`, height: `${size}px` }} />
    </div>
  );
};

export default React.memo(Magnifier);
