import React, { useState, useRef, useEffect } from 'react';
import { ColorPoint, ImageData, ColorMatchResult } from './types';
import { getColorFromImage, generateRandomColorPoints, formatColorArray, averagePairwiseDistance, generateDiverseColorSamples, matchColorPalette } from './utils/colorUtils';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ColorMatchModal from './components/ColorMatchModal';

const App: React.FC = () => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [colorPoints, setColorPoints] = useState<ColorPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [colorCount, setColorCount] = useState(9);
  const [isCopied, setIsCopied] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<ColorMatchResult | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (file: File) => {
    if (imageData?.url) { try { URL.revokeObjectURL(imageData.url); } catch {} }
    const url = URL.createObjectURL(file);
    const newImageData: ImageData = { file, url, name: file.name };
    setColorPoints([]);
    setSelectedPointId(null);
    setImageData(newImageData);
  };

  useEffect(() => {
    if (!imageData || !imageRef.current) return;
    const image = imageRef.current;
    const ensurePoints = () => {
      setColorPoints(prev => {
        if (prev.length === 0) {
          const diverse = generateDiverseColorSamples(image, colorCount, image.offsetWidth, image.offsetHeight, {
            minDeltaE: 18,
            minPixelDistance: 24,
            attemptsPerPoint: 150,
            margin: 16,
          });
          const withIds: ColorPoint[] = diverse.map((p, idx) => ({ id: idx + 1, ...p }));
          setSelectedPointId(withIds[0]?.id ?? null);
          return withIds;
        }
        // 当数量增加时，使用普通随机取样并取色，不使用多样性算法
        if (prev.length < colorCount) {
          const addCount = colorCount - prev.length;
          const nextIdStart = (prev.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
          const addedRaw = generateRandomColorPoints(addCount, image.offsetWidth, image.offsetHeight).map((p, idx) => ({
            ...p,
            id: nextIdStart + idx,
          }));
          const added: ColorPoint[] = addedRaw.map(p => {
            const { color, hex } = getColorFromImage(image, p.x, p.y);
            return { ...p, color, hex };
          });
          return [...prev, ...added];
        }
        if (prev.length > colorCount) {
          const trimmed = prev.slice(0, colorCount);
          if (selectedPointId && !trimmed.find(p => p.id === selectedPointId)) {
            setSelectedPointId(trimmed[trimmed.length - 1]?.id ?? null);
          }
          return trimmed;
        }
        return prev;
      });
    };
    if (image.complete) ensurePoints(); else image.onload = ensurePoints;
  }, [imageData, colorCount]);

  const updateColorPoint = (id: number, x: number, y: number) => {
    if (!imageRef.current) return;
    const { color, hex } = getColorFromImage(imageRef.current, x, y);
    setColorPoints(prev => prev.map(p => (p.id === id ? { ...p, x, y, color, hex } : p)));
  };

  const selectColorPoint = (id: number) => {
    setSelectedPointId(prev => (prev === id ? null : id));
  };

  const deleteColorPoint = (id: number) => {
    setColorPoints(prev => {
      const next = prev.filter(p => p.id !== id);
      setSelectedPointId(current => (current === id ? (next.length ? next[Math.max(0, next.length - 1)].id : null) : current));
      return next;
    });
    setColorCount(prev => Math.max(0, prev - 1));
  };

  const reorderColorPoints = (fromIndex: number, toIndex: number) => {
    setColorPoints(prev => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex > prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const randomizePoints = () => {
    if (!imageRef.current) return;
    const image = imageRef.current;
    // 减少试验次数以提高性能
    const trials = Math.min(5, Math.max(2, Math.floor(colorCount / 2)));
    let best: ColorPoint[] | null = null;
    let bestScore = -Infinity;
    
    // 使用setTimeout避免阻塞UI
    const runTrial = (trialIndex: number) => {
      if (trialIndex >= trials) {
        // 所有试验完成，应用最佳结果
        if (best) {
          setColorPoints(best);
          setSelectedPointId(current => (best!.some(p => p.id === current) ? current : best![0]?.id ?? null));
        }
        return;
      }

      setTimeout(() => {
        const diverse = generateDiverseColorSamples(image, colorCount, image.offsetWidth, image.offsetHeight, {
          minDeltaE: 18,
          minPixelDistance: 24,
          attemptsPerPoint: 100, // 减少尝试次数
          margin: 16,
        });
        const withIds: ColorPoint[] = diverse.map((p, idx) => ({ id: (colorPoints[idx]?.id ?? idx + 1), ...p }));
        const score = averagePairwiseDistance(withIds.map(p => p.hex));
        if (score > bestScore) { 
          bestScore = score; 
          best = withIds; 
        }
        
        // 继续下一个试验
        runTrial(trialIndex + 1);
      }, 0);
    };

    // 开始第一个试验
    runTrial(0);
  };

  const copyColorArray = async () => {
    const hexColors = colorPoints.map(point => point.hex);
    const colorArrayString = formatColorArray(hexColors);
    try {
      await navigator.clipboard.writeText(colorArrayString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleMatchColors = () => {
    const hexColors = colorPoints.map(point => point.hex);
    const result = matchColorPalette(hexColors);
    setMatchResult(result);
    setIsMatchModalOpen(true);
  };

  const closeMatchModal = () => {
    setIsMatchModalOpen(false);
    setMatchResult(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        imageData={imageData}
        onImageUpload={handleImageUpload}
        colorCount={colorCount}
        onColorCountChange={setColorCount}
        onCopyColors={copyColorArray}
        isCopied={isCopied}
        onRandomize={randomizePoints}
        onMatchColors={handleMatchColors}
        hasColorPoints={colorPoints.length > 0}
      />
      <Workspace
        imageData={imageData}
        colorPoints={colorPoints}
        selectedPointId={selectedPointId}
        onUpdateColorPoint={updateColorPoint}
        onSelectColorPoint={selectColorPoint}
        onDeleteColorPoint={deleteColorPoint}
        onReorderPoints={reorderColorPoints}
        imageRef={imageRef}
      />
      
      {/* 颜色匹配弹窗 */}
      <ColorMatchModal
        isOpen={isMatchModalOpen}
        onClose={closeMatchModal}
        matchResult={matchResult}
      />
    </div>
  );
};

export default App;
