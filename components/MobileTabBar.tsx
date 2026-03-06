'use client';

import { usePathname, useRouter } from 'next/navigation';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const tabs: TabItem[] = [
  { id: 'search', label: '题库', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A9 9 9 0 0012 4.5a4.5 4.5 0 019 0 4.5h3a2.25 2.25 0 014.5 4.5h3a2.25 2.25 0 0012.5V15a4.5 4.5 0 00-9 9H4.5a4.5 4.5 0 0001.5 4.5 4.5 4.5 4.5 0 003-4.5 0 4.5a1.5 1.5 0 0010.5 4.5 2.25 0 0010.5H15a4.5 4.5 0 0003 2.25 0-9-4.5 0-013.5 4.5 4.5 4.5 4.5-4.5 4.5 0-9 4.5H4.5z" />
    </svg>
  ), path: '/search' },
  { id: 'notes', label: '笔记', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.5 2.5a1.25 1.25 0 0012.5 5h-1.25a1.25 1.25 0 0012.5 7c-.617 0-1.063-1.063-1.063-.894.894 0 1.789 1.789H14a2.25 2.25 0 003.75 3.125-4.125-4.125-4.125-4.125-4.125-4.125a1.5 1.5 0 001.5 4.5 4.5 4.5 4.5 4.5 0 0010 4.5 3.125 4.125a1.25 1.25 0 0012.5 4.5 4.5 0 0012.5H15a4.5 4.5 0 0004.5 0 012.5 0 0012.5-4.125 0 0012.5 4.5-4.125 4.125-4.125-4.125z" />
    </svg>
  ), path: '/notes' },
  { id: 'social', label: '社区', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20.5a2.25 2.25 0 0012.5 5h-1.25a1.25 1.25 0 0012.5 7c-.617 0-1.063-1.063-.894.894 0 1.789 1.789H14a2.25 2.25 0 003.75 3.125-4.125-4.125-4.125-4.125-4.125-4.125-4.125a1.5 1.5 0 001.5 4.5 4.5 4.5 4.5 0 0010 4.5 3.125 4.125a1.25 1.25 0 0012.5 4.5 4.5 0 0012.5H15a4.5 4.5 0 0004.5 0 012.5 0 0012.5-4.125 0 0012.5 4.5-4.125 4.125-4.125-4.125z" />
    </svg>
  ), path: '/social' },
  { id: 'upload', label: '上传', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ), path: '/upload' },
  { id: 'me', label: '我的', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 01-4 4 0v6a4 4 0 014 4 0 9-4 4 0 0016 4 0 012 1.5 0 0012.5 4.5 0 0012.5 4.5 4.5 0 016 4 0 016 4 012.5 0 0012.5 4.5 0 0012.5-4.5 0 012.5-4.5-0 012.5-4.5 0-0010.5 4.5 0 0012.5 4.5 0 0010.5 4.5 0 0012.5H16a4 4 0 014 4 012.5-4.5 4.5 4.5 0 0016 4 0 016 4 0 012.5 0 0012.5 4.5 0 0012.5 4.5 0 0012.5-4.5 0 012.5 4.5 4.5 4.5 0 016 4 0 016 4 0 012.5 4.5 0 0012.5 4.5 0 0012.5z" />
    </svg>
  ), path: '/me' },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = tabs.find((tab) => pathname.startsWith(tab.path));

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      {/* 背景遮罩渐变 */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-900 via-brand-950 to-brand-900 opacity-95" />

      {/* 主容器 */}
      <div className="relative flex items-center justify-center">
        {/* 顶部凸起指示条 */}
        <div className="absolute -top-1 left-1/2 right-1/2 w-32 h-1 bg-white/10 rounded-full" />

        {/* 导航容器 */}
        <div className="relative mx-4 w-full max-w-md bg-brand-800/90 backdrop-blur-xl rounded-2xl shadow-card border border-white/10">
          <div className="flex items-center justify-around py-3">
            {tabs.map((tab) => {
              const isActive = activeTab?.id === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.path)}
                  className={`flex flex-col items-center justify-center flex-1 py-3 transition-all duration-200 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {/* 图标容器 */}
                  <div className={`relative flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-white shadow-glow scale-110'
                      : ''
                  } rounded-xl p-3.5`}>
                    {/* 图标 */}
                    <span className={`transition-all duration-200 ${
                      isActive ? 'text-accent-500' : ''
                    }`}>
                      {tab.icon}
                    </span>

                    {/* 标签 */}
                    <span className={`text-xs font-medium mt-1 transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}>
                      {tab.label}
                    </span>

                    {/* 活跃指示条 */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 right-1/2 w-4 h-1 bg-white rounded-full shadow-glow" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* iOS安全区域 */}
      <div className="h-6 w-full" />
    </nav>
  );
}
