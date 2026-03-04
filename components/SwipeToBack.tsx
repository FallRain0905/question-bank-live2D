'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeToBackProps {
  backPath: string;
  threshold?: number;
  enabled?: boolean;
  children: React.ReactNode;
}

export default function SwipeToBack({
  backPath,
  threshold = 100, // 滑动阈值（像素）
  enabled = true,
  children,
}: SwipeToBackProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    let animationFrameId: number;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        hasNavigatedRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        !touchStartRef.current ||
        !hasNavigatedRef.current ||
        e.touches.length !== 1
      )
        return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - touchStartRef.current.x;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

      // 只响应水平滑动，忽略垂直滑动
      if (Math.abs(deltaX) > deltaY && deltaX > threshold) {
        hasNavigatedRef.current = true;
        router.push(backPath);

        // 触觉反馈（如果设备支持）
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled, backPath, threshold, router]);

  return (
    <div ref={containerRef} className="touch-pan-x select-none">
      {children}
    </div>
  );
}
