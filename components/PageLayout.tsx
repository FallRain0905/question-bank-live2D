// 通用页面布局组件
// 确保所有页面有一致的背景和样式

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* 背景装饰 - 和主页一致 */}
      <div className="fixed inset-0 pointer-events-none theme-bg-gradient" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-32 left-1/3 w-80 h-80 bg-brand-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
      </div>
      
      {/* 内容区域 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
