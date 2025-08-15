import React, { useState } from 'react';
import { ColorMatchResult } from '../types';

interface ColorMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: ColorMatchResult | null;
}

const ColorMatchModal: React.FC<ColorMatchModalProps> = ({ isOpen, onClose, matchResult }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success'>('idle');

  if (!isOpen || !matchResult) return null;

  const copyIdArray = async () => {
    try {
      setCopyStatus('copying');
      await navigator.clipboard.writeText(`[${matchResult.idArray.join(', ')}]`);
      setCopyStatus('success');
      
      // 2秒后恢复默认状态
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      setCopyStatus('idle');
    }
  };

  const getCopyButtonContent = () => {
    switch (copyStatus) {
      case 'copying':
        return (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>复制中...</span>
          </>
        );
      case 'success':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>已复制！</span>
          </>
        );
      default:
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>复制</span>
          </>
        );
    }
  };

  const getCopyButtonStyle = () => {
    switch (copyStatus) {
      case 'copying':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">颜色匹配结果</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* 上部分：最终ID数组 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-3">最终ID数组</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 relative">
              <button
                onClick={copyIdArray}
                disabled={copyStatus === 'copying'}
                className={`absolute top-3 right-3 px-3 py-1 text-sm rounded transition-all duration-200 flex items-center space-x-1 ${getCopyButtonStyle()} ${
                  copyStatus === 'copying' ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {getCopyButtonContent()}
              </button>
              <code className="text-sm font-mono text-gray-800 break-all pr-20">
                [{matchResult.idArray.join(', ')}]
              </code>
            </div>
          </div>

          {/* 下部分：匹配列表 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">匹配详情</h3>
            <div className="space-y-3">
              {matchResult.matches.map((match, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  {/* 序号 */}
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* 调色板中的颜色 */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: match.originalHex }}
                    />
                    <code className="text-sm font-mono text-gray-700">{match.originalHex}</code>
                  </div>
                  
                  {/* 箭头 */}
                  <div className="text-gray-400 text-lg">→</div>
                  
                  {/* 匹配到的色库颜色 */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: match.matchedHex }}
                    />
                    <code className="text-sm font-mono text-gray-700">{match.matchedHex}</code>
                  </div>
                  
                  {/* 等号 */}
                  <div className="text-gray-400 text-lg">=</div>
                  
                  {/* ID */}
                  <div className="text-lg font-bold text-blue-600 flex-shrink-0">
                    ID: {match.matchedId}
                  </div>
                  
                  {/* 色差 */}
                  <div className="text-sm text-gray-500 flex-shrink-0">
                    ΔE: {match.distance.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorMatchModal;
