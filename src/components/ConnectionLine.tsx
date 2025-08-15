import React from 'react';
import { ColorPoint } from '../types';

interface ConnectionLineProps {
  selectedPoint: ColorPoint | undefined;
  colorPoints: ColorPoint[];
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  selectedPoint,
  colorPoints,
}) => {
  if (!selectedPoint) return null;

  // 计算连接线的起点（取样点位置）
  const startX = selectedPoint.x;
  const startY = selectedPoint.y;

  // 计算连接线的终点（调色板位置）
  // 调色板在右侧，距离图片容器右边 24px，每个条目高度约 60px
  const paletteX = 24; // 距离图片容器右边的距离
  const paletteItemHeight = 60;
  const paletteItemPadding = 8;
  const selectedIndex = colorPoints.findIndex(p => p.id === selectedPoint.id);
  const paletteY = selectedIndex * (paletteItemHeight + paletteItemPadding) + paletteItemHeight / 2;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-30"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <line
        x1={startX}
        y1={startY}
        x2={paletteX}
        y2={paletteY}
        stroke="white"
        strokeWidth="3"
        strokeDasharray="5,5"
        filter="url(#glow)"
      />
      <line
        x1={startX}
        y1={startY}
        x2={paletteX}
        y2={paletteY}
        stroke="black"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    </svg>
  );
};

export default ConnectionLine;
