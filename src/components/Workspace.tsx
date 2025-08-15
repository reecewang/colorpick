import React from 'react';
import { ColorPoint, ImageData } from '../types';
import ColorSamplePoint from './ColorSamplePoint';
import ColorPalette from './ColorPalette';
import Magnifier from './Magnifier';

interface WorkspaceProps {
  imageData: ImageData | null;
  colorPoints: ColorPoint[];
  selectedPointId: number | null;
  onUpdateColorPoint: (id: number, x: number, y: number) => void;
  onSelectColorPoint: (id: number) => void;
  onDeleteColorPoint: (id: number) => void;
  onReorderPoints: (fromIndex: number, toIndex: number) => void;
  imageRef: React.RefObject<HTMLImageElement>;
}

const Workspace: React.FC<WorkspaceProps> = ({
  imageData,
  colorPoints,
  selectedPointId,
  onUpdateColorPoint,
  onSelectColorPoint,
  onDeleteColorPoint,
  onReorderPoints,
  imageRef,
}) => {
  if (!imageData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">您的图片将在此处显示</h3>
          <p className="text-gray-500">请先上传一张图片开始取色</p>
        </div>
      </div>
    );
  }

  const selectedPoint = colorPoints.find(p => p.id === selectedPointId) || null;

  return (
    <div className="flex-1 flex items-start bg-gray-50 p-6">
      {/* 左：图片预览容器（主体） */}
      <div className="flex-1 flex items-start justify-center">
        <div
          className="relative inline-block"
          onClick={() => {
            if (selectedPointId) {
              onSelectColorPoint(selectedPointId);
            }
          }}
        >
          <img
            ref={imageRef}
            src={imageData.url}
            alt={imageData.name}
            className="object-contain rounded-lg shadow-lg max-w-[60vw] max-h-[70vh]"
            draggable={false}
          />
          
          {/* 颜色取样点 */}
          {colorPoints.map((point) => (
            <ColorSamplePoint
              key={point.id}
              point={point}
              isSelected={point.id === selectedPointId}
              onUpdatePosition={(x, y) => onUpdateColorPoint(point.id, x, y)}
              onSelect={() => onSelectColorPoint(point.id)}
            />
          ))}
        </div>
      </div>

      {/* 中：放大镜固定列（不遮挡图片） */}
      <div className="ml-6 self-start">
        <Magnifier imageRef={imageRef} selectedPoint={selectedPoint} imageKey={imageData.url} />
      </div>

      {/* 右：垂直调色板固定列 */}
      <div className="ml-6 self-start">
        <ColorPalette
          colorPoints={colorPoints}
          selectedPointId={selectedPointId}
          onSelectPoint={onSelectColorPoint}
          onDeletePoint={onDeleteColorPoint}
          onReorderPoints={onReorderPoints}
        />
      </div>
    </div>
  );
};

export default Workspace;
