'use client';

import { useEffect, useRef, useState } from 'react';
import { getLive2DSettings, onLive2DSettingsUpdated, type Live2DSettings } from '@/lib/live2d-settings';

export default function Live2DCharacter() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [settings, setSettings] = useState<Live2DSettings | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 确保在客户端挂载后才执行
    setMounted(true);
    setSettings(getLive2DSettings());

    // 监听设置更新
    const unsubscribe = onLive2DSettingsUpdated((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  // 清理旧的Live2D实例
  const cleanupLive2D = () => {
    if (appRef.current) {
      try {
        appRef.current.destroy(true, { children: true });
      } catch (error) {
        console.error('清理Live2D失败:', error);
      }
      appRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    modelRef.current = null;
  };

  useEffect(() => {
    // 如果未挂载或设置未加载，不执行
    if (!mounted || !settings) {
      return;
    }

    // 如果设置为不可见，则不渲染
    if (!settings.visible) {
      return;
    }

    // 动态加载脚本
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // 检查是否已加载
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initLive2D = async () => {
      try {
        // 清理旧的实例
        cleanupLive2D();

        // 按正确顺序加载必需的脚本
        // 1. 先加载PIXI
        await loadScript('/libs/pixi.min.js');
        // 2. 加载Live2D核心库
        await loadScript('/libs/live2dcubismcore.min.js');
        // 3. 加载Live2D绑定
        await loadScript('/libs/live2d.min.js');
        // 4. 加载Live2D适配器
        await loadScript('/libs/index.min.js');

        // 等待库初始化
        await new Promise(resolve => setTimeout(resolve, 800));

        // 检查PIXI是否可用
        if (typeof (window as any).PIXI === 'undefined') {
          console.error('PIXI未加载，检查脚本路径');
          throw new Error('PIXI库加载失败');
        }

        const PIXI = (window as any).PIXI;
        console.log('PIXI版本:', PIXI.VERSION);

        // 创建PIXI应用 - 最简配置，避免渲染器检测问题
        let app;
        try {
          // 最简配置，让PIXI自动处理渲染器
          app = new PIXI.Application({
            width: settings.canvasWidth,
            height: settings.canvasHeight,
            transparent: true, // 设置透明
          });
          console.log('PIXI渲染器类型:', app.renderer.type);
          console.log('WebGL可用:', (app.renderer as any).webgl);
          console.log('PIXI应用创建成功');
        } catch (error) {
          console.error('PIXI应用创建失败:', error);
          console.warn('Live2D加载失败，但不影响其他功能');
          return () => {}; // 返回空清理函数
        }

        appRef.current = app;
        console.log('PIXI应用创建成功，画布尺寸:', settings.canvasWidth, 'x', settings.canvasHeight);

        // 获取容器并添加canvas
        if (containerRef.current) {
          containerRef.current.appendChild(app.view);

          // 如果启用点击穿透，设置canvas不响应事件
          if (settings.enableClickThrough) {
            app.view.style.pointerEvents = 'none';
          } else {
            app.view.style.pointerEvents = 'auto';
          }
        }

        // 加载neko模型
        const model = await PIXI.live2d.Live2DModel.from('/live2d/model/neko/ziraitikuwa.model3.json', {
          autoFocus: false,
        });

        modelRef.current = model;

        // 设置模型属性 - 调整位置让头部可见
        app.stage.addChild(model);
        const centerX = settings.canvasWidth / 2;
        const centerY = settings.canvasHeight * 0.65; // 稍微靠下，让头部可见
        model.x = centerX;
        model.y = centerY;
        model.anchor.set(0.5, 0.5);
        model.scale.set(settings.modelScale);

        // 根据设置决定是否启用点击穿透
        const enableClickThrough = settings.enableClickThrough;

        if (enableClickThrough) {
          // 点击穿透模式：不设置interactive，通过全局事件处理
          model.interactive = false;

          // 模型拖拽逻辑（通过全局事件）
          let isDragging = false;
          let dragStartPos = { x: 0, y: 0 };
          let modelStartPos = { x: 0, y: 0 };

          // 检查点击是否在模型区域内
          const isClickOnModel = (event: MouseEvent): boolean => {
            if (!model) return false;

            // 获取模型边界
            const bounds = model.getBounds();
            const rect = app.view.getBoundingClientRect();

            // 将鼠标坐标转换为画布坐标
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;

            // 检查是否在模型边界内（增加一些padding让点击更容易）
            const padding = 20;
            return (
              localX >= bounds.x - padding &&
              localX <= bounds.x + bounds.width + padding &&
              localY >= bounds.y - padding &&
              localY <= bounds.y + bounds.height + padding
            );
          };

          // 全局pointerdown事件监听
          const handlePointerDown = (event: MouseEvent) => {
            // 检查是否在模型区域内
            if (isClickOnModel(event)) {
              isDragging = true;
              dragStartPos = { x: event.clientX, y: event.clientY };
              modelStartPos = { x: model.x, y: model.y };

              // 设置光标样式
              document.body.style.cursor = 'move';
              event.preventDefault();
              event.stopPropagation();
            }
          };

          // 全局pointermove事件监听
          const handlePointerMove = (event: MouseEvent) => {
            if (!isDragging) return;

            const deltaX = event.clientX - dragStartPos.x;
            const deltaY = event.clientY - dragStartPos.y;

            model.x = modelStartPos.x + deltaX;
            model.y = modelStartPos.y + deltaY;
          };

          // 全局pointerup事件监听
          const handlePointerUp = () => {
            if (isDragging) {
              isDragging = false;
              document.body.style.cursor = '';
            }
          };

          // 添加事件监听器
          (window as any).addEventListener('pointerdown', handlePointerDown);
          (window as any).addEventListener('pointermove', handlePointerMove);
          (window as any).addEventListener('pointerup', handlePointerUp);

          // 鼠标跟随
          let mouseFollowEnabled = true;
          const mouseMoveHandler = (e: MouseEvent) => {
            if (!mouseFollowEnabled || !model) return;

            const rect = app.view.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (typeof model.focus === 'function') {
              model.focus(x, y);
            }
          };

          (window as any).addEventListener('mousemove', mouseMoveHandler);

          // 返回清理函数（用于useEffect cleanup）
          return () => {
            (window as any).removeEventListener('pointerdown', handlePointerDown);
            (window as any).removeEventListener('pointermove', handlePointerMove);
            (window as any).removeEventListener('pointerup', handlePointerUp);
            (window as any).removeEventListener('mousemove', mouseMoveHandler);
            document.body.style.cursor = '';
          };
        } else {
          // 普通模式：使用PIXI的interactive系统
          model.interactive = true;
          model.cursor = 'move';

          // 拖拽功能
          let isDragging = false;
          let dragStartPos = { x: 0, y: 0 };
          let modelStartPos = { x: 0, y: 0 };

          model.on('pointerdown', (e: any) => {
            isDragging = true;
            dragStartPos = { x: e.data.global.x, y: e.data.global.y };
            modelStartPos = { x: model.x, y: model.y };
          });

          app.view.addEventListener('pointermove', (e: any) => {
            if (!isDragging) return;
            const rect = app.view.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const deltaX = x - dragStartPos.x;
            const deltaY = y - dragStartPos.y;
            model.x = modelStartPos.x + deltaX;
            model.y = modelStartPos.y + deltaY;
          });

          app.view.addEventListener('pointerup', () => {
            isDragging = false;
          });
          app.view.addEventListener('pointerupoutside', () => {
            isDragging = false;
          });

          // 鼠标跟随
          let mouseFollowEnabled = true;
          const mouseMoveHandler = (e: MouseEvent) => {
            if (!mouseFollowEnabled || !model) return;

            const rect = app.view.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (typeof model.focus === 'function') {
              model.focus(x, y);
            }
          };

          (window as any).addEventListener('mousemove', mouseMoveHandler);

          // 返回清理函数（用于useEffect cleanup）
          return () => {
            (window as any).removeEventListener('mousemove', mouseMoveHandler);
          };
        }
      } catch (error) {
        console.error('Live2D加载失败:', error);
        return () => {
          cleanupLive2D();
        };
      }
    };

    // 在useEffect内部调用async函数
    const cleanupPromise = initLive2D();

    // useEffect的清理函数需要是同步的
    return () => {
      // 如果initLive2D返回了Promise，我们需要等待它完成
      if (cleanupPromise && typeof cleanupPromise.then === 'function') {
        cleanupPromise.then(cleanup => {
          if (cleanup && typeof cleanup === 'function') {
            cleanup();
          }
        });
      }
      // 无论如何，都要清理Live2D
      cleanupLive2D();
    };

  }, [mounted, settings]);

  // 如果未挂载或设置未加载，不渲染
  if (!mounted || !settings) {
    return null;
  }

  // 如果设置为不可见，不渲染
  if (!settings.visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-20 left-4 sm:bottom-8 sm:left-8 z-50 transition-all duration-300"
      style={{
        width: `${settings.canvasWidth}px`,
        height: `${settings.canvasHeight}px`,
        pointerEvents: 'none', // 画布穿透点击
      }}
    />
  );
}
