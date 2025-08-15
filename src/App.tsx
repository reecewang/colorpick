import { useState, useRef } from 'react';
import { getColorFromImage, generateRandomColorPoints, averagePairwiseDistance, generateDiverseColorSamples, matchColorPalette } from './utils/colorUtils';
import { ColorPoint, ColorMatchResult } from './types';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import ColorMatchModal from './components/ColorMatchModal';

function App() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [colorPoints, setColorPoints] = useState<ColorPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [colorCount, setColorCount] = useState(8);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<ColorMatchResult | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (data: string) => {
    setImageData(data);
    setColorPoints([]);
    setSelectedPointId(null);
  };

  const handleColorCountChange = (count: number) => {
    setColorCount(count);
    if (imageRef.current && count > 0) {
      const image = imageRef.current;
      const newPointsRaw = generateRandomColorPoints(count, image.offsetWidth, image.offsetHeight);
      // 为每个点获取颜色信息
      const newPoints: ColorPoint[] = newPointsRaw.map((point) => {
        const { color, hex } = getColorFromImage(image, point.x, point.y);
        return { ...point, color, hex };
      });
      setColorPoints(newPoints);
      setSelectedPointId(newPoints[0]?.id ?? null);
    } else {
      setColorPoints([]);
      setSelectedPointId(null);
    }
  };

  const updateColorPoint = (id: number, x: number, y: number) => {
    if (!imageRef.current) return;
    
    const image = imageRef.current;
    const { color, hex } = getColorFromImage(image, x, y);
    
    setColorPoints(prev => prev.map(point => 
      point.id === id ? { ...point, x, y, color, hex } : point
    ));
  };

  const selectColorPoint = (id: number) => {
    setSelectedPointId(prev => prev === id ? null : id);
  };

  const deleteColorPoint = (id: number) => {
    setColorPoints(prev => {
      const newPoints = prev.filter(point => point.id !== id);
      // 重新分配ID
      const reorderedPoints = newPoints.map((point, index) => ({
        ...point,
        id: index + 1
      }));
      
      // 如果删除的是当前选中的点，选择第一个点
      if (selectedPointId === id) {
        setSelectedPointId(reorderedPoints[0]?.id ?? null);
      }
      
      return reorderedPoints;
    });
  };

  const reorderColorPoints = (fromIndex: number, toIndex: number) => {
    setColorPoints(prev => {
      const newPoints = [...prev];
      const [movedPoint] = newPoints.splice(fromIndex, 1);
      newPoints.splice(toIndex, 0, movedPoint);
      
      // 重新分配ID
      return newPoints.map((point, index) => ({
        ...point,
        id: index + 1
      }));
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
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar
        imageData={imageData}
        onImageUpload={handleImageUpload}
        colorCount={colorCount}
        onColorCountChange={handleColorCountChange}
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
}

export default App;
