'use client';

import { useState, useRef, WheelEvent } from 'react';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  maxZoom?: number;
  minZoom?: number;
}

export default function ZoomableImage({
  src,
  alt = '图片',
  className = '',
  maxZoom = 3,
  minZoom = 1,
}: ZoomableImageProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isZoomed = zoom > 1;

  // 重置缩放
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // 双击切换缩放
  const handleDoubleClick = () => {
    if (isZoomed) {
      handleReset();
    } else {
      setZoom(2);
    }
  };

  // 滚轮缩放
  const handleWheel = (e: WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + delta));
    setZoom(newZoom);

    // 当缩小到最小值时，重置位置
    if (newZoom <= minZoom) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // 触摸拖拽开始
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isZoomed || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    });
  };

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || !isZoomed) return;
    e.preventDefault();
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // 触摸结束
  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 鼠标拖拽
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !isZoomed) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden touch-pan-y ${className}`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={src}
        alt={alt}
        onDoubleClick={handleDoubleClick}
        className={`max-w-full transition-transform duration-150 ease-out ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
        draggable={false}
      />

      {/* 重置按钮 */}
      {isZoomed && (
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* 缩放提示 */}
      {isZoomed && (
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
          {(zoom * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
