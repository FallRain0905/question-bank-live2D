'use client';

import { usePathname, useRouter } from 'next/navigation';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const tabs: TabItem[] = [
  { id: 'search', label: '题库', icon: '📚', path: '/search' },
  { id: 'notes', label: '笔记', icon: '📝', path: '/notes' },
  { id: 'social', label: '社区', icon: '💬', path: '/social' },
  { id: 'upload', label: '上传', icon: '📤', path: '/upload' },
  { id: 'me', label: '我的', icon: '👤', path: '/me' },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = tabs.find(tab => pathname.startsWith(tab.path));

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-brand-800/95 backdrop-blur-md border-t border-brand-700 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-1 pb-safe">
        {tabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 py-2 transition ${
                isActive
                  ? 'text-brand-400'
                  : 'text-brand-500 hover:text-brand-400'
              }`}
            >
              <span className={`text-xl mb-1 ${isActive ? 'transform scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-1.5 h-1 bg-brand-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
