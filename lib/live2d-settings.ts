// Live2D 设置管理

export interface Live2DSettings {
  canvasWidth: number;
  canvasHeight: number;
  modelScale: number;
  visible: boolean;
  enableClickThrough: boolean; // 是否启用点击穿透
}

const DEFAULT_SETTINGS: Live2DSettings = {
  canvasWidth: 600,
  canvasHeight: 550,  // 更高的画布，让模型能看到头部
  modelScale: 0.5,  // 提高最大缩放限制，自动缩放会根据模型实际尺寸调整
  visible: true, // 默认显示Live2D模型
  enableClickThrough: true, // 默认启用点击穿透
};

const STORAGE_KEY = 'live2d-settings';

// 获取设置
export function getLive2DSettings(): Live2DSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 迁移旧的设置格式（canvasSize -> canvasWidth, canvasHeight）
      if ('canvasSize' in parsed && !('canvasWidth' in parsed)) {
        parsed.canvasWidth = parsed.canvasSize;
        parsed.canvasHeight = parsed.canvasSize + 100; // 高度比宽度多100px
        parsed.enableClickThrough = true; // 默认启用穿透
        delete parsed.canvasSize;
        // 保存迁移后的设置
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }

      // 如果没有enableClickThrough字段，设置为默认值true
      if (!('enableClickThrough' in parsed)) {
        parsed.enableClickThrough = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }

      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('读取Live2D设置失败:', error);
  }

  return { ...DEFAULT_SETTINGS };
}

// 保存设置
export function saveLive2DSettings(settings: Partial<Live2DSettings>) {
  if (typeof window === 'undefined') return;

  try {
    const currentSettings = getLive2DSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // 触发自定义事件通知Live2D组件更新
    window.dispatchEvent(new CustomEvent('live2d-settings-updated', {
      detail: newSettings
    }));
  } catch (error) {
    console.error('保存Live2D设置失败:', error);
  }
}

// 监听设置更新
export function onLive2DSettingsUpdated(callback: (settings: Live2DSettings) => void) {
  const handler = (event: CustomEvent<Live2DSettings>) => {
    callback(event.detail);
  };

  window.addEventListener('live2d-settings-updated', handler as EventListener);

  return () => {
    window.removeEventListener('live2d-settings-updated', handler as EventListener);
  };
}
