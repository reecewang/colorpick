import React, { useRef } from 'react';
import { ImageData } from '../types';

interface SidebarProps {
  imageData: ImageData | null;
  onImageUpload: (file: File) => void;
  colorCount: number;
  onColorCountChange: (count: number) => void;
  onCopyColors: () => void;
  isCopied: boolean;
  onRandomize?: () => void;
  onMatchColors?: () => void;
  hasColorPoints: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  imageData,
  onImageUpload,
  colorCount,
  onColorCountChange,
  onCopyColors,
  isCopied,
  onRandomize,
  onMatchColors,
  hasColorPoints,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const decrease = () => {
    onColorCountChange(Math.max(0, colorCount - 1));
  };

  const increase = () => {
    onColorCountChange(Math.min(20, colorCount + 1));
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col">
      {/* 标题区 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">图像取色器</h1>
        <p className="text-gray-600 text-sm">
          拖动图片上的取样点来创建调色板，一键复制结果。
        </p>
      </div>

      {/* 图片上传模块 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">上传图片</h2>
        {!imageData ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="text-gray-500 mb-2">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">点击上传图片或拖拽到此处</p>
            <p className="text-xs text-gray-500 mt-1">支持 JPG、PNG、GIF 格式</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <img
                src={imageData.url}
                alt={imageData.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {imageData.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(imageData.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              重新上传
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 颜色数量控制器 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-lg font-semibold text-gray-900">颜色数量</label>
          <div className="flex items-center space-x-2 select-none">
            <button
              onClick={decrease}
              disabled={colorCount <= 0}
              className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
              aria-label="减少颜色数量"
              title="减少"
            >
              −
            </button>
            <span className="text-sm text-gray-700 w-6 text-center">{colorCount}</span>
            <button
              onClick={increase}
              disabled={colorCount >= 20}
              className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
              aria-label="增加颜色数量"
              title="增加"
            >
              +
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="20"
          value={colorCount}
          onChange={(e) => onColorCountChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>20</span>
        </div>
      </div>

      {/* 随机分布按钮 */}
      <div className="mb-8">
        <button
          onClick={onRandomize}
          disabled={!imageData || colorCount === 0}
          className="w-full py-2.5 px-4 rounded-lg font-medium bg-gray-900 text-white hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          随机重新分布取样点
        </button>
        <p className="mt-2 text-xs text-gray-500">尽量最大化颜色差异性</p>
      </div>

      {/* 导出按钮组 */}
      <div className="mt-auto space-y-3">
        {/* 复制HEX数组按钮 */}
        <button
          onClick={onCopyColors}
          disabled={!imageData || !hasColorPoints}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isCopied
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
          }`}
        >
          {isCopied ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>已复制!</span>
            </div>
          ) : (
            '复制HEX数组'
          )}
        </button>

        {/* 匹配色库按钮 */}
        <button
          onClick={onMatchColors}
          disabled={!imageData || !hasColorPoints}
          className="w-full py-3 px-4 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          匹配色库
        </button>
        <p className="text-xs text-gray-500 text-center">将调色板颜色匹配到标准色库</p>
      </div>
    </div>
  );
};

export default Sidebar;
