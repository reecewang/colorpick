import React from 'react';

interface SidebarProps {
  imageData: string | null;
  onImageUpload: (data: string) => void;
  colorCount: number;
  onColorCountChange: (count: number) => void;
  onRandomize: () => void;
  onMatchColors: () => void;
  hasColorPoints: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  imageData,
  onImageUpload,
  colorCount,
  onColorCountChange,
  onRandomize,
  onMatchColors,
  hasColorPoints,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onImageUpload(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onImageUpload(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const increase = () => {
    if (colorCount < 20) {
      onColorCountChange(colorCount + 1);
    }
  };

  const decrease = () => {
    if (colorCount > 0) {
      onColorCountChange(colorCount - 1);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col h-full">
      {/* 图片上传区域 */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">图像取色器</h2>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            imageData
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-400 bg-gray-50 hover:border-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {imageData ? (
            <div className="space-y-2">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-600">点击更换图片</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">拖拽图片到此处或点击上传</p>
              <p className="text-xs text-gray-500">支持 JPG、PNG、GIF 格式</p>
            </div>
          )}
        </div>
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
