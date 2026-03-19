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
  isDark?: boolean;
  // 扩展配色
  bg?: string;           // 背景色
  bgGradient?: string;   // 背景渐变
  cardBg?: string;       // 卡片背景
  cardBorder?: string;   // 卡片边框
  textPrimary?: string;  // 主要文字
  textSecondary?: string; // 次要文字
  buttonPrimary?: string; // 主按钮
  buttonSecondary?: string; // 次按钮
  accent?: string;       // 强调色
  shadow?: string;       // 阴影色
}

export interface CustomThemeColors {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
}

// ============================================
// 方案一：深邃专业风（第五组配色）
// ============================================
const PROFESSIONAL_THEME: Theme = {
  id: 'professional',
  name: '深邃专业',
  isDark: false,
  colors: {
    50: '#c0e6fd',   // 最浅 - 背景渐变起点
    100: '#80aad3',  // 浅蓝
    200: '#5b86b6',  // 中浅蓝
    300: '#3f6593',  // 中蓝 - 图标色
    400: '#2a4d78',  // 中深蓝
    500: '#1b3554',  // 主色 - 按钮、标题
    600: '#152a45',  // 深蓝
    700: '#0f1f35',  // 更深
    800: '#091526',  // 很深
    900: '#040b18',  // 极深
    950: '#000f22',  // 最深 - 页脚背景
  },
  // 扩展配色
  bg: 'linear-gradient(to bottom, #c0e6fd, #ffffff, #ffffff)',
  cardBg: 'rgba(255, 255, 255, 0.9)',
  cardBorder: 'rgba(128, 170, 211, 0.3)',
  textPrimary: '#1b3554',
  textSecondary: '#3f6593',
  buttonPrimary: '#1b3554',
  buttonSecondary: '#80aad3',
  accent: '#3f6593',
  shadow: 'rgba(128, 170, 211, 0.2)',
};

// ============================================
// 方案二：温润清新风（第三组配色）
// ============================================
const FRESH_THEME: Theme = {
  id: 'fresh',
  name: '温润清新',
  isDark: false,
  colors: {
    50: '#d8fcd5',   // 最浅绿 - 背景渐变起点
    100: '#e1f2cd',  // 浅绿
    200: '#e8eac5',  // 淡黄绿
    300: '#efe2bd',  // 浅黄 - 卡片边框
    400: '#f7dbb6',  // 浅橙
    500: '#fdd3af',  // 橙色 - 主按钮
    600: '#e8b88a',  // 深橙
    700: '#d49a5f',  // 更深
    800: '#b87d3f',  // 很深
    900: '#8a5a2a',  // 极深 - 标题文字
    950: '#3d5a2e',  // 深绿 - 正文文字
  },
  // 扩展配色
  bg: 'linear-gradient(to bottom, #d8fcd5, #ffffff, #ffffff)',
  cardBg: 'rgba(255, 255, 255, 0.95)',
  cardBorder: 'rgba(239, 226, 189, 0.5)',
  textPrimary: '#3d5a2e',      // 深绿色 - 主文字
  textSecondary: '#5a7a4a',    // 中绿色 - 次要文字
  buttonPrimary: '#f7dbb6',
  buttonSecondary: 'transparent',
  accent: '#fdd3af',
  shadow: 'rgba(216, 252, 213, 0.3)',
};

// ============================================
// 方案三：科技未来感（第四组配色）
// ============================================
const TECH_THEME: Theme = {
  id: 'tech',
  name: '科技未来',
  isDark: false,
  colors: {
    50: '#e7ffc9',   // 最浅绿 - 背景渐变起点
    100: '#c2ecd6',  // 浅青绿
    200: '#a4dee1',  // 青色 - 背景中段
    300: '#7ccbed',  // 浅蓝 - 页脚
    400: '#59bcf6',  // 蓝色 - 次要文字
    500: '#3aaeff',  // 亮蓝 - 主按钮
    600: '#2b9de8',  // 深蓝
    700: '#1c8ad0',  // 更深
    800: '#0d77b6',  // 很深
    900: '#0a5a8a',  // 极深
    950: '#1a3a4a',  // 深青 - 文字
  },
  // 扩展配色
  bg: 'linear-gradient(to bottom, #e7ffc9, #a4dee1, #c2ecd6)',
  cardBg: 'rgba(255, 255, 255, 0.7)',  // 半透明 - 磨砂玻璃效果
  cardBorder: 'rgba(164, 222, 225, 0.4)',
  textPrimary: '#1a3a4a',
  textSecondary: '#2d5a6e',
  buttonPrimary: '#3aaeff',
  buttonSecondary: 'transparent',
  accent: '#59bcf6',
  shadow: 'rgba(164, 222, 225, 0.25)',
};

// ============================================
// 主题注册
// ============================================
export const themes: Record<string, Theme> = {
  professional: PROFESSIONAL_THEME,
  fresh: FRESH_THEME,
  tech: TECH_THEME,
};

// 默认主题
export const DEFAULT_THEME = 'professional';

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

  // 设置 CSS 变量 - 颜色
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

  // 设置扩展变量
  if (theme.bg) root.style.setProperty('--theme-bg', theme.bg);
  if (theme.cardBg) root.style.setProperty('--theme-card-bg', theme.cardBg);
  if (theme.cardBorder) root.style.setProperty('--theme-card-border', theme.cardBorder);
  if (theme.textPrimary) root.style.setProperty('--theme-text-primary', theme.textPrimary);
  if (theme.textSecondary) root.style.setProperty('--theme-text-secondary', theme.textSecondary);
  if (theme.buttonPrimary) root.style.setProperty('--theme-button-primary', theme.buttonPrimary);
  if (theme.buttonSecondary) root.style.setProperty('--theme-button-secondary', theme.buttonSecondary);
  if (theme.accent) root.style.setProperty('--theme-accent', theme.accent);
  if (theme.shadow) root.style.setProperty('--theme-shadow', theme.shadow);

  // 移除旧主题类，添加新主题类
  root.classList.remove('theme-professional', 'theme-fresh', 'theme-tech');
  root.classList.add(`theme-${themeId}`);

  // 深色模式标记
  if (theme.isDark) {
    root.classList.add('dark-mode');
  } else {
    root.classList.remove('dark-mode');
  }
}

// 初始化主题
export function initTheme(): void {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme.id);
}

// 获取所有主题列表
export function getThemeList(): { id: string; name: string }[] {
  return Object.values(themes).map(t => ({ id: t.id, name: t.name }));
}
