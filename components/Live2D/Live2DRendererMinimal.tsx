'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import type { Live2DModel as Live2DModelConfig, Live2DExpression } from '@/types/live2d';

export interface Live2DRendererMinimalProps {
  model: Live2DModelConfig;
  mousePosition?: { x: number; y: number };
  onExpressionChange?: (expression: Live2DExpression) => void;
  onModelLoaded?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export interface Live2DRendererMinimalRef {
  setExpression: (expression: Live2DExpression) => void;
  triggerMotion: (motion: string) => void;
}

/**
 * Live2D 最小化渲染器
 * 使用现有的 PIXI 和 pixi-live2d-display 包
 */
const Live2DRendererMinimal = forwardRef<Live2DRendererMinimalRef, Live2DRendererMinimalProps>(
  ({ model, mousePosition, onExpressionChange, onModelLoaded, onError, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        setExpression: (expression: Live2DExpression) => {
          console.log('[Live2DRendererMinimal] 设置表情:', expression);
          onExpressionChange?.(expression);
        },
        triggerMotion: (motion: string) => {
          console.log('[Live2DRendererMinimal] 触发动作:', motion);
        },
      }),
      [onExpressionChange]
    );

    // 加载 Live2D 模型
    useEffect(() => {
      if (!model || !containerRef.current) {
        return;
      }

      const initLive2D = async () => {
        try {
          setIsLoading(true);
          setError(null);

          console.log('[Live2DRendererMinimal] 开始加载 Live2D 模型:', model.path);

          // 动态导入 pixi.js 和 pixi-live2d-display
          const [pixiModule, live2dModule] = await Promise.all([
            import('pixi.js'),
            import('pixi-live2d-display').catch(() => {
              // 如果 pixi-live2d-display 加载失败，尝试从不同的路径导入
              console.warn('[Live2DRendererMinimal] pixi-live2d-display 主导入失败，尝试备用路径');
              return import('pixi-live2d-display/cubism4');
            }),
          ]);

          const PIXI = pixiModule.default || pixiModule;
          const { Live2DModel } = live2dModule;

          console.log('[Live2DRendererMinimal] PIXI 和 Live2D 模块加载成功');

          // 创建 PIXI 应用
          const app = new PIXI.Application({
            width: 400,
            height: 500,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            backgroundColor: 0x000000,
          });

          if (containerRef.current) {
            containerRef.current.appendChild(app.view as HTMLCanvasElement);
          }

          console.log('[Live2DRendererMinimal] PIXI 应用创建成功');

          // 加载 Live2D 模型
          const live2dModel = await Live2DModel.from(model.path);

          console.log('[Live2DRendererMinimal] Live2D 模型加载成功');
          console.log('[Live2DRendererMinimal] 模型信息:', {
            name: model.name,
            internalModel: live2dModel.internalModel,
            hitAreas: live2dModel.internalModel?.hitAreas,
          });

          // 添加模型到舞台
          app.stage.addChild(live2dModel);

          // 调整模型位置和缩放
          live2dModel.anchor.set(0.5, 0);
          live2dModel.scale.set(1.2, 1.2);
          live2dModel.y = 500;

          // 添加交互
          live2dModel.on('hit', (hitAreas: any) => {
            console.log('[Live2DRendererMinimal] 点击区域:', hitAreas);
          });

          // 眼睛跟随鼠标（如果 mousePosition 可用）
          if (mousePosition) {
            const updateEyeTracking = () => {
              const canvas = app.view as HTMLCanvasElement;
              const rect = canvas.getBoundingClientRect();
              const x = (mousePosition.x - rect.left) / rect.width;
              const y = (mousePosition.y - rect.top) / rect.height;

              // 设置眼睛跟随参数
              if (live2dModel.internalModel?.setParameters) {
                live2dModel.internalModel.setParameters({
                  ParamAngleX: (x - 0.5) * 30,
                  ParamAngleY: (y - 0.5) * 30,
                  ParamEyeBallX: (x - 0.5),
                  ParamEyeBallY: (y - 0.5),
                });
              }
              requestAnimationFrame(updateEyeTracking);
            };
            updateEyeTracking();
          }

          setIsLoaded(true);
          setIsLoading(false);
          onModelLoaded?.();
          onExpressionChange?.('normal');
          console.log('[Live2DRendererMinimal] Live2D 渲染器初始化完成');

          // 保存应用和模型引用用于清理
          (containerRef.current as any).__app = app;
          (containerRef.current as any).__model = live2dModel;

        } catch (err) {
          console.error('[Live2DRendererMinimal] Live2D 加载失败:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
          setIsLoading(false);
          onError?.(new Error(errorMessage));
        }
      };

      initLive2D();

      // 清理函数
      return () => {
        if (containerRef.current) {
          const app = (containerRef.current as any).__app;
          const model = (containerRef.current as any).__model;

          if (app) {
            app.destroy(true, {
              children: true,
              texture: false,
              baseTexture: false,
            });
          }

          const canvas = containerRef.current.querySelector('canvas');
          if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        }
      };
    }, [model, onModelLoaded, onError, onExpressionChange, mousePosition]);

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full rounded-lg overflow-hidden ${className || ''}`}
      >
        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg">
              <div className="w-3 h-3 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">加载 Live2D 模型中...</span>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90">
            <div className="text-center px-4">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium text-red-600">Live2D 加载失败</p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
              <p className="text-xs text-gray-400 mt-2">pixi-live2d-display 渲染器</p>
            </div>
          </div>
        )}

        {/* 模型已加载 - 显示信息 */}
        {isLoaded && !error && !isLoading && (
          <div className="absolute top-2 left-2 text-xs text-gray-600 bg-white/90 px-2 py-1 rounded shadow-sm">
            {model.name} (PIXI + Live2D)
          </div>
        )}
      </div>
    );
  }
);

Live2DRendererMinimal.displayName = 'Live2DRendererMinimal';

export default Live2DRendererMinimal;
