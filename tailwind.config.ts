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
        // 品牌色 - 使用 CSS 变量支持主题切换
        brand: {
          950: 'var(--brand-950, #06141B)',  // 深色背景
          900: 'var(--brand-900, #0F1E2A)',  // 更深的色调
          800: 'var(--brand-800, #11212D)',  // 次深色背景
          700: 'var(--brand-700, #1A2938)',  // 中深色
          600: 'var(--brand-600, #253745)',  // 主深色
          500: 'var(--brand-500, #4A5C6A)',  // 中性色
          400: 'var(--brand-400, #6B7D8C)',  // 中浅色
          300: 'var(--brand-300, #8C9B9F)',  // 浅色
          200: 'var(--brand-200, #9BA8AB)',  // 辅助色
          100: 'var(--brand-100, #B3BEC1)',  // 更浅
          50: 'var(--brand-50, #CCD0CF)',   // 极浅背景
          0: '#F5F7F7',    // 最浅（固定）
        },
        primary: {
          50: 'var(--brand-50, #CCD0CF)',
          100: 'var(--brand-100, #B3BEC1)',
          200: 'var(--brand-200, #9BA8AB)',
          300: 'var(--brand-300, #8C9B9F)',
          400: 'var(--brand-400, #6B7D8C)',
          500: 'var(--brand-500, #4A5C6A)',
          600: 'var(--brand-600, #253745)',
          700: 'var(--brand-700, #1A2938)',
          800: 'var(--brand-800, #11212D)',
          900: 'var(--brand-900, #0F1E2A)',
          950: 'var(--brand-950, #06141B)',
        },
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(6, 20, 27, 0.08)',
        'soft-lg': '0 8px 30px rgba(6, 20, 27, 0.12)',
        'glow': '0 0 20px rgba(74, 92, 106, 0.2)',
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
