import React, { useRef, useState } from 'react';
import { ColorPoint } from '../types';

interface ColorPaletteProps {
  colorPoints: ColorPoint[];
  selectedPointId: number | null;
  onSelectPoint: (id: number) => void;
  onDeletePoint: (id: number) => void;
  onReorderPoints: (fromIndex: number, toIndex: number) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  colorPoints,
  selectedPointId,
  onSelectPoint,
  onDeletePoint,
  onReorderPoints,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [containerEdge, setContainerEdge] = useState<'top' | 'bottom' | null>(null);

  const clearDragIndicators = () => {
    setDragOverIndex(null);
    setDragPosition(null);
    setContainerEdge(null);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // 自动滚动（接近顶部/底部时）
    const scroller = scrollRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const edge = 24; // px
      const speed = 14; // px per event
      if (e.clientY < rect.top + edge) {
        scroller.scrollTop -= speed;
        setContainerEdge('top');
        setDragOverIndex(null);
        setDragPosition(null);
      } else if (e.clientY > rect.bottom - edge) {
        scroller.scrollTop += speed;
        setContainerEdge('bottom');
        setDragOverIndex(null);
        setDragPosition(null);
      } else {
        setContainerEdge(null);
      }
    }
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromText = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(fromText, 10);
    if (Number.isNaN(fromIndex)) return;

    let toIndex = colorPoints.length; // 默认追加到末尾
    const scroller = scrollRef.current;
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      const threshold = 16;
      if (e.clientY <= rect.top + threshold) {
        toIndex = 0;
      } else if (e.clientY >= rect.bottom - threshold) {
        toIndex = colorPoints.length;
      } else if (dragOverIndex !== null && dragPosition) {
        toIndex = dragPosition === 'after' ? dragOverIndex + 1 : dragOverIndex;
      }
    }
    clearDragIndicators();
    onReorderPoints(fromIndex, toIndex);
  };

  const handleItemHover = (index: number, position: 'before' | 'after') => {
    setContainerEdge(null);
    setDragOverIndex(index);
    setDragPosition(position);
  };

  const handleDragEnd = () => {
    clearDragIndicators();
  };

  return (
    <div
      ref={scrollRef}
      className="w-56 max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-lg p-3 select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      <h3 className="text-sm font-semibold text-gray-900 mb-3">调色板</h3>
      {/* 顶部占位提示 */}
      {containerEdge === 'top' && (
        <div className="px-2">
          <div className="h-0.5 border-t-2 border-dashed border-blue-400 rounded-sm" />
        </div>
      )}
      <div
        ref={listRef}
        className="space-y-1.5"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragEnd={handleDragEnd}
      >
        {colorPoints.map((point, idx) => (
          <PaletteItem
            key={point.id}
            index={idx}
            point={point}
            isSelected={point.id === selectedPointId}
            isDropTarget={dragOverIndex === idx}
            dropPosition={dragPosition}
            onSelect={() => onSelectPoint(point.id)}
            onDelete={() => onDeletePoint(point.id)}
            onReorder={onReorderPoints}
            onHover={handleItemHover}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
      {/* 底部占位提示 */}
      {containerEdge === 'bottom' && (
        <div className="px-2 mt-1.5">
          <div className="h-0.5 border-t-2 border-dashed border-blue-400 rounded-sm" />
        </div>
      )}
    </div>
  );
};

interface PaletteItemProps {
  index: number;
  point: ColorPoint;
  isSelected: boolean;
  isDropTarget: boolean;
  dropPosition: 'before' | 'after' | null;
  onSelect: () => void;
  onDelete: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onHover: (index: number, position: 'before' | 'after') => void;
  onDragEnd: () => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({
  index,
  point,
  isSelected,
  isDropTarget,
  dropPosition,
  onSelect,
  onDelete,
  onReorder,
  onHover,
  onDragEnd,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(itemRef.current, rect.width / 2, rect.height / 2);
    }
  };

  const handleDragStartContainer = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isSelected) return;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(itemRef.current, rect.width / 2, rect.height / 2);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    onHover(index, isAfter ? 'after' : 'before');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const fromText = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(fromText, 10);
    if (Number.isNaN(fromIndex)) return;

    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const isAfter = e.clientY > rect.top + rect.height / 2;
    const toIndex = isAfter ? index + 1 : index;
    onReorder(fromIndex, toIndex);
    onDragEnd();
  };

  const ringClass = isDropTarget ? 'ring-1 ring-blue-300' : '';

  return (
    <div
      ref={itemRef}
      className={`relative flex items-center space-x-2 p-2 rounded-lg transition-all duration-150 select-none ${
        isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
      } ${ringClass}`}
      onClick={onSelect}
      draggable={isSelected}
      onDragStart={handleDragStartContainer}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      {/* 顶部占位线 */}
      {isDropTarget && dropPosition === 'before' && (
        <div className="absolute left-2 right-2 -mt-2">
          <div className="h-0.5 border-t-2 border-dashed border-blue-400 rounded-sm" />
        </div>
      )}

      {/* 编号（按顺序显示） */}
      <div className="w-5 h-5 flex items-center justify-center text-[11px] font-medium text-gray-600">
        {index + 1}
      </div>
      
      {/* 颜色预览块 */}
      <div className="relative">
        <div
          className="w-6 h-6 rounded border border-gray-200"
          style={{ backgroundColor: point.color }}
        />
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-black rounded-full"></div>
          </div>
        )}
      </div>
      
      {/* HEX 代码 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-gray-900 truncate">{point.hex}</p>
      </div>

      {/* 删除按钮（仅选中时显示） */}
      {isSelected && (
        <button
          className="ml-2 px-2 h-6 text-[11px] text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="删除该色块"
          title="删除该色块"
        >
          ×
        </button>
      )}

      {/* 拖拽手柄（最右侧） */}
      <div
        className="ml-1 p-1 rounded cursor-grab active:cursor-grabbing text-gray-500 hover:bg-gray-100"
        draggable
        onDragStart={handleDragStart}
        onMouseDown={(e) => e.stopPropagation()}
        title="拖动以排序"
        aria-label="拖动以排序"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="5" r="1.5" />
          <circle cx="10" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="5" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="15" cy="10" r="1.5" />
        </svg>
      </div>

      {/* 底部占位线 */}
      {isDropTarget && dropPosition === 'after' && (
        <div className="absolute left-2 right-2 -mb-2" style={{ bottom: 0 }}>
          <div className="h-0.5 border-t-2 border-dashed border-blue-400 rounded-sm" />
        </div>
      )}
    </div>
  );
};

export default ColorPalette;
