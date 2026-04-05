'use client';

import { ReactNode } from 'react';

interface WorkbenchLayoutProps {
  children: ReactNode;
}

export default function WorkbenchLayout({ children }: WorkbenchLayoutProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-brand-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
            🚧
          </div>
          <span className="text-lg font-bold text-brand-800">AI学习工作台</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm text-brand-600 hover:text-brand-800 transition-colors">
            📊 数据分析
          </button>
          <button className="text-sm text-brand-600 hover:text-brand-800 transition-colors">
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 主要内容区域 - 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}