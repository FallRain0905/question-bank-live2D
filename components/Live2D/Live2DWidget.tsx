'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Live2DModel } from '@/types/live2d';
import Live2DRenderer from './Live2DRendererMinimal';
import { DEFAULT_MODEL_CONFIG } from '@/lib/live2d';
import ModelSwitcher from './ModelSwitcher';

/**
 * Live2D Widget 主组件
 * 看板娘展示组件 - 负责模型渲染、拖拽定位、表情/动作控制
 */
export default function Live2DWidget() {
  const [models] = useState<Live2DModel[]>(DEFAULT_MODEL_CONFIG.models);
  const [currentModel, setCurrentModel] = useState<Live2DModel | null>(null);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const dragOffset = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 鼠标位置追踪（用于眼神跟随）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 从 localStorage 恢复位置和模型
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 恢复位置
      const savedPosition = localStorage.getItem('live2d_widget_position');
      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition));
        } catch {
          // 使用默认位置
        }
      }

      // 恢复模型选择
      const savedModelId = localStorage.getItem('live2d_selected_model');
      if (savedModelId && models.length > 0) {
        const savedModel = models.find((m) => m.id === savedModelId);
        if (savedModel && !currentModel) {
          setCurrentModel(savedModel);
        }
      }
    }
  }, [models, currentModel]);

  // 保存位置到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('live2d_widget_position', JSON.stringify(position));
    }
  }, [position]);

  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) {
      return;
    }

    // 获取元素当前的实际位置
    const element = elementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const elementLeft = rect.left;
    const elementTop = rect.top;

    // 计算鼠标相对于元素的偏移量
    dragOffset.current = {
      x: e.clientX - elementLeft,
      y: e.clientY - elementTop,
    };

    setIsDragging(true);
  };

  // 处理拖拽移动
  useEffect(() => {
    const handleDragMove = (e: MouseEvent) => {
      if (!isDragging || !elementRef.current) return;

      // 计算新的元素位置：鼠标当前位置 - 鼠标相对于元素的偏移量
      const newLeft = e.clientX - dragOffset.current.x;
      const newTop = e.clientY - dragOffset.current.y;

      // 计算相对于窗口右下角的位置（因为我们的 style 是用 bottom 和 left）
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 元素尺寸
      const elementWidth = isMobile ? windowWidth : 400;
      const elementHeight = isMobile ? 256 : 500;

      // 限制边界，确保元素不会移出屏幕
      const maxLeft = windowWidth - elementWidth;
      const maxBottom = windowHeight - elementHeight;

      const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
      const clampedBottom = Math.max(0, Math.min(newTop, maxBottom));

      // 转换为 bottom/left 坐标
      const newPosition = {
        x: clampedLeft,
        y: clampedBottom,
      };

      setPosition(newPosition);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, isMobile]);

  return (
    <div
      ref={elementRef}
      className={`fixed z-50 ${isMobile ? 'bottom-0 left-0 right-0 h-64' : 'bottom-24 left-24 w-[400px] h-[500px]'}`}
      style={
        !isMobile
          ? { left: `${position.x}px`, bottom: `${position.y}px` }
          : {}
      }
      onMouseDown={handleDragStart}
    >
      {currentModel && (
        <Live2DRenderer
          ref={rendererRef}
          model={currentModel}
          mousePosition={mousePosition}
          onModelLoaded={() => {
            console.log('[Live2DWidget] 模型加载完成');
          }}
          onError={(error) => {
            console.error('[Live2DWidget] 渲染错误:', error);
            alert(`Live2D 渲染错误: ${error.message}`);
          }}
          className="w-full h-full"
        />
      )}

      {/* 控制按钮 */}
      <div className="absolute top-2 right-2 flex gap-2">
        {/* 模型切换器 */}
        <ModelSwitcher
          models={models}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
        />
      </div>

      {/* 表情/动作控制按钮 */}
      <div className="absolute bottom-2 left-2 right-2 flex gap-2 justify-center">
        <motion.button
          onClick={() => rendererRef.current?.setExpression('happy')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-sm"
          title="开心"
          type="button"
        >
          😊
        </motion.button>
        <motion.button
          onClick={() => rendererRef.current?.setExpression('thinking')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-sm"
          title="思考"
          type="button"
        >
          🤔
        </motion.button>
        <motion.button
          onClick={() => rendererRef.current?.triggerMotion('wave')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-sm"
          title="挥手"
          type="button"
        >
          👋
        </motion.button>
      </div>
    </div>
  );
}
