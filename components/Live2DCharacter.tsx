'use client';

import { useEffect, useRef, useState } from 'react';
import { getLive2DSettings, onLive2DSettingsUpdated, type Live2DSettings } from '@/lib/live2d-settings';

// 格式化错误消息，处理各种类型的错误对象
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error instanceof Event) {
    return `Event: ${error.type}`;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  if (error && typeof error === 'object' && 'toString' in error) {
    try {
      return String((error as any).toString());
    } catch {
      return '[Object]';
    }
  }
  return String(error);
}

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
        console.error('清理Live2D失败:', formatError(error));
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
          console.log(`脚本已加载: ${src}`);
          resolve();
          return;
        }

        const script = document.createElement('script');
        // 添加时间戳避免缓存问题
        const timestamp = new Date().getTime();
        script.src = `${src}?t=${timestamp}`;
        script.onload = () => {
          console.log(`脚本加载成功: ${src}`);
          resolve();
        };
        script.onerror = (event) => {
          console.error(`脚本加载失败: ${src}`, event);
          reject(new Error(`Failed to load script: ${src}`));
        };
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

        // 创建PIXI应用 - 使用最基础的配置，避免渲染器检测问题
        let app;

        try {
          // 检查WebGL支持
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

          if (gl) {
            // WebGL可用，创建PIXI应用
            app = new PIXI.Application({
              width: settings.canvasWidth,
              height: settings.canvasHeight,
              view: canvas,
              transparent: true,
              backgroundAlpha: 0,
              antialias: true,
            });
            console.log('WebGL可用，使用WebGL渲染器');
          } else {
            console.log('WebGL不可用，跳过Live2D加载');
            throw new Error('WebGL不可用，Live2D需要WebGL支持');
          }

          appRef.current = app;

          console.log('PIXI版本:', PIXI.VERSION);
          console.log('渲染器类型:', app.renderer.type);
          console.log('画布尺寸:', settings.canvasWidth, 'x', settings.canvasHeight);

        } catch (error) {
          console.error('PIXI应用创建失败:', formatError(error));
          // 不要抛出错误，让用户可以正常使用应用
          console.warn('Live2D加载失败，但不影响其他功能');
          // 检查是否是因为WebGL不可用
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (!gl) {
            console.warn('您的浏览器不支持WebGL，Live2D需要WebGL才能运行');
            console.warn('建议使用现代浏览器：Chrome、Firefox、Safari等');
          }
          return () => {}; // 返回空清理函数
        }

        // 如果app创建失败，直接返回
        if (!app) {
          return () => {};
        }

        appRef.current = app;
        console.log('PIXI应用创建成功，画布尺寸:', settings.canvasWidth, 'x', settings.canvasHeight);

        // 获取容器并添加canvas
        if (containerRef.current) {
          containerRef.current.appendChild(app.view);

          // 设置Canvas样式确保完全透明
          app.view.style.backgroundColor = 'transparent !important';
          app.view.style.background = 'none !important';

          // 如果启用点击穿透，设置canvas不响应事件
          if (settings.enableClickThrough) {
            app.view.style.pointerEvents = 'none';
          } else {
            app.view.style.pointerEvents = 'auto';
          }
        }

        // 加载neko模型 - 添加时间戳避免缓存问题
        const modelUrl = `/live2d/model/neko/ziraitikuwa.model3.json?t=${new Date().getTime()}`;
        console.log('开始加载Live2D模型:', modelUrl);
        console.log('当前浏览器URL:', window.location.href);

        // 添加详细的加载监控
        let loadAttempt = 0;
        const maxAttempts = 3;

        const loadModelWithRetry = async (url: string): Promise<any> => {
          try {
            loadAttempt++;
            console.log(`尝试加载模型 (${loadAttempt}/${maxAttempts}):`, url);

            // 使用fetch先测试文件可访问性
            const testResponse = await fetch(url, {
              method: 'HEAD',
              cache: 'no-store'
            });

            console.log('文件测试响应:', {
              status: testResponse.status,
              type: testResponse.headers.get('Content-Type'),
              url: testResponse.url
            });

            if (!testResponse.ok) {
              throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
            }

            const model = await PIXI.live2d.Live2DModel.from(url, {
              autoFocus: false,
            });

            console.log('Live2D模型加载成功');
            return model;

          } catch (error) {
            console.error(`模型加载尝试 ${loadAttempt} 失败:`, formatError(error));

            if (loadAttempt < maxAttempts) {
              // 等待后重试
              await new Promise(resolve => setTimeout(resolve, 1000 * loadAttempt));
              return loadModelWithRetry(url);
            } else {
              // 最终失败，抛出错误
              throw new Error(`模型加载失败（已尝试${maxAttempts}次）: ${formatError(error)}`);
            }
          }
        };

        const model = await loadModelWithRetry(modelUrl);

        modelRef.current = model;

        // 设置模型属性 - 调整位置让模型完整显示
        app.stage.addChild(model);
        const centerX = settings.canvasWidth / 2;
        const centerY = settings.canvasHeight * 0.5; // 垂直居中
        model.x = centerX;
        model.y = centerY;
        model.anchor.set(0.5, 0.5);

        // 根据模型实际尺寸计算合适的缩放比例
        const modelBounds = model.getBounds();
        const scaleX = (settings.canvasWidth * 0.8) / modelBounds.width;
        const scaleY = (settings.canvasHeight * 0.8) / modelBounds.height;
        const autoScale = Math.min(scaleX, scaleY);

        // 使用自动计算的缩放比例，但不超过设置的最大缩放
        model.scale.set(Math.min(autoScale, settings.modelScale));

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
        const errorMessage = formatError(error);
        console.error('Live2D加载失败:', errorMessage);
        console.warn('Live2D功能暂时不可用，但应用其他功能正常');

        // 显示用户友好的错误信息
        if (typeof window !== 'undefined') {
          console.warn('Live2D加载失败可能原因:');
          console.warn('1. 浏览器网络连接问题');
          console.warn('2. 静态文件访问权限问题');
          console.warn('3. Next.js服务器配置问题');
          console.warn('4. 浏览器缓存或CORS问题');
          console.warn('建议：尝试清除浏览器缓存或使用无痕模式');
        }

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
        background: 'none !important',
        backgroundColor: 'transparent !important',
      }}
    />
  );
}
