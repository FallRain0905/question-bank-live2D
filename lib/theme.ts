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
  a: {
    id: 'a',
    name: '深蓝商务',
    colors: {
      50: '#F8F6F6',
      100: '#D6DEEB',
      200: '#6191D3',
      300: '#396A2D',
      400: '#396A2D',
      500: '#132843',
      600: '#132843',
      700: '#0F1F35',
      800: '#0C1830',
      900: '#081224',
      950: '#040C18',
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
  c: {
    id: 'c',
    name: '清新薄荷',
    colors: {
      50: '#D1B6E1',
      100: '#9DC8C8',
      200: '#74DBCC',
      300: '#58C9B9',
      400: '#58C9B9',
      500: '#519D9E',
      600: '#519D9E',
      700: '#42827E',
      800: '#33675E',
      900: '#254D3E',
      950: '#17321F',
    },
  },
  d: {
    id: 'd',
    name: '暖橙夕照',
    colors: {
      50: '#D75725',
      100: '#B5B5B3',
      200: '#6CBDA1',
      300: '#61A2DA',
      400: '#61A2DA',
      500: '#D77186',
      600: '#D77186',
      700: '#B45A6C',
      800: '#914454',
      900: '#6E2E3D',
      950: '#4B1D27',
    },
  },
  e: {
    id: 'e',
    name: '梦幻天空',
    colors: {
      50: '#A6BDFB',
      100: '#D4DDFD',
      200: '#F5F8FF',
      300: '#FFF6AB',
      400: '#FFF6AB',
      500: '#FDAB76',
      600: '#FDAB76',
      700: '#E8945F',
      800: '#CF7D49',
      900: '#B66532',
      950: '#9D4E1B',
    },
  },
  f: {
    id: 'f',
    name: '春日花园',
    colors: {
      50: '#BDD249',
      100: '#D0DE86',
      200: '#E5EFC4',
      300: '#FFE5D2',
      400: '#FFE5D2',
      500: '#F0B8B3',
      600: '#F0B8B3',
      700: '#D99A96',
      800: '#C27D79',
      900: '#AB5F5C',
      950: '#94423F',
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
