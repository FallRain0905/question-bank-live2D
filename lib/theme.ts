// 主题配色方案配置
export interface Theme {
  id: string;
  name: string;
  colors: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export const themes: Record<string, Theme> = {
  // 保留原有的两个主题
  a: {
    id: 'a',
    name: '深蓝商务',
    colors: {
      50: '#F0F9FF',
      100: '#E0F2FE',
      200: '#BAE6FD',
      300: '#7DD3FC',
      400: '#38BDF8',
      500: '#0EA5E9',
      600: '#0284C7',
      700: '#0369A1',
      800: '#075985',
      900: '#0C4A6E',
      950: '#082F49',
    },
  },
  b: {
    id: 'b',
    name: '紫罗兰',
    colors: {
      50: '#EDE5E3',
      100: '#DBBACB',
      200: '#87799E',
      300: '#6CBDA1',
      400: '#6CBDA1',
      500: '#6E87B0',
      600: '#6E87B0',
      700: '#5B6E8F',
      800: '#4A5675',
      900: '#3A3E5B',
      950: '#2A2B40',
    },
  },
  // 新增配色方案 - 根据报告建议
  c: {
    id: 'c',
    name: '学院蓝',
    colors: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
      950: '#0F172A',
    },
  },
  d: {
    id: 'd',
    name: '清新绿',
    colors: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
      950: '#022C22',
    },
  },
  e: {
    id: 'e',
    name: '高级紫灰',
    colors: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      200: '#DDD6FE',
      300: '#C4B5FD',
      400: '#A78BFA',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
      800: '#5B21B6',
      900: '#4C1D95',
      950: '#2E1065',
    },
  },
};

// 默认主题
export const DEFAULT_THEME = 'a';

// 获取当前主题
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') return themes[DEFAULT_THEME];
  const saved = localStorage.getItem('theme');
  return themes[saved || DEFAULT_THEME] || themes[DEFAULT_THEME];
}

// 设置当前主题
export function setCurrentTheme(themeId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', themeId);
  applyTheme(themeId);
}

// 应用主题到页面
export function applyTheme(themeId: string): void {
  const theme = themes[themeId];
  if (!theme) return;

  const root = document.documentElement;

  // 移除所有旧的主题类
  Object.keys(themes).forEach(key => {
    root.classList.remove(`theme-${key}`);
  });

  // 添加新主题类
  root.classList.add(`theme-${themeId}`);

  // 设置 CSS 变量
  root.style.setProperty('--brand-50', theme.colors[50]);
  root.style.setProperty('--brand-100', theme.colors[100]);
  root.style.setProperty('--brand-200', theme.colors[200]);
  root.style.setProperty('--brand-300', theme.colors[300]);
  root.style.setProperty('--brand-400', theme.colors[400]);
  root.style.setProperty('--brand-500', theme.colors[500]);
  root.style.setProperty('--brand-600', theme.colors[600]);
  root.style.setProperty('--brand-700', theme.colors[700]);
  root.style.setProperty('--brand-800', theme.colors[800]);
  root.style.setProperty('--brand-900', theme.colors[900]);
  root.style.setProperty('--brand-950', theme.colors[950]);
}

// 初始化主题
export function initTheme(): void {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme.id);
}
