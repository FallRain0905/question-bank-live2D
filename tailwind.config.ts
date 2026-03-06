import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // 深色科技风格 - 参考 Notion / 小红书
        brand: {
          950: '#0A1628',  // 深藏青背景
          900: '#0D1B28',  // 深色调
          800: '#121212',  // 主背景色
          700: '#1E293B',  // 次深色
          600: '#2D3748',  // 卡片背景
          500: '#4A5568',  // 悬停/边框色
          400: '#6B7280',  // 辅助文字
          300: '#9CA3AF',  // 高亮色
          200: '#B4B9C2',  // 浅灰
          100: '#D1D5DB',  // 更浅灰
          50: '#E2E8F0',  // 极浅背景
          0: '#F5F7F7',    // 最浅（固定）
        },
        // 主要文字色 - 白色
        primary: {
          50: '#E2E8F0',
          100: '#D1D5DB',
          200: '#B4B9C2',
          300: '#9CA3AF',
          400: '#6B7280',
          500: '#4A5568',
          600: '#2D3748',
          700: '#1E293B',
          800: '#121212',
          900: '#0D1B28',
          950: '#0A1628',
        },
        // 辅助文字色 - 灰色
        secondary: {
          50: '#E2E8F0',
          100: '#D1D5DB',
          200: '#B4B9C2',
          300: '#9CA3AF',
          400: '#6B7280',
          500: '#FFFFFF',  // 主文字白色
          600: '#9CA3AF',
          700: '#E2E8F0',
          800: '#D1D5DB',
          900: '#B4B9C2',
          950: '#9CA3AF',
        },
        // 强调色 - 清新绿/蓝
        accent: {
          50: '#06B6D4',  // 清新绿
          100: '#22D3EE',
          200: '#38BDF8',
          300: '#34D399',
          400: '#0F766E',
          500: '#10B981',  // 主强调色
          600: '#14B8A6',
          700: '#059669',
          800: '#06B6D4',
          900: '#22D3EE',
          950: '#06B6D4',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(10, 132, 166, 0.06)',
        'soft-lg': '0 4px 16px rgba(10, 132, 166, 0.1)',
        'glow': '0 0 8px rgba(6, 182, 212, 0.15)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'blob': 'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
