import React from 'react';
import Draggable from 'react-draggable';
import { ColorPoint } from '../types';

interface ColorSamplePointProps {
  point: ColorPoint;
  isSelected: boolean;
  onUpdatePosition: (x: number, y: number) => void;
  onSelect: () => void;
}

const ColorSamplePoint: React.FC<ColorSamplePointProps> = ({
  point,
  isSelected,
  onUpdatePosition,
  onSelect,
}) => {
  const handleDrag = (_e: any, data: { x: number; y: number }) => {
    // 拖拽时实时更新位置，不使用防抖
    onUpdatePosition(data.x, data.y);
  };

  const handleStart = () => {
    onSelect();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 点击同一取样点时的切换逻辑由上层控制
  };

  return (
    <Draggable
      position={{ x: point.x, y: point.y }}
      onStart={handleStart}
      onDrag={handleDrag}
      bounds="parent"
      // 移动端触摸优化
      handle=".drag-handle"
    >
      <div
        className={`absolute left-0 top-0 cursor-move select-none ${
          isSelected ? 'z-20' : 'z-10'
        }`}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onTouchStart={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          className={`drag-handle rounded-full border border-white shadow-lg transition-all duration-150 ${
            isSelected ? 'w-5 h-5 sm:w-6 sm:h-6 border-2' : 'w-3 h-3 sm:w-4 sm:h-4'
          }`}
          style={{
            backgroundColor: point.color,
            boxShadow: isSelected
              ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px rgba(0,0,0,0.3)'
              : '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </Draggable>
  );
};

export default React.memo(ColorSamplePoint);
