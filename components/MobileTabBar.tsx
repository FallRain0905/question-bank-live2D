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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ), path: '/search' },
  { id: 'notes', label: '笔记', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ), path: '/notes' },
  { id: 'social', label: '社区', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ), path: '/social' },
  { id: 'upload', label: '上传', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ), path: '/upload' },
  { id: 'me', label: '我的', icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
