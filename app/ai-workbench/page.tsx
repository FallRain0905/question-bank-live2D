'use client';

import { useState } from 'react';
import { ConversationProvider } from '@/contexts/ai-workbench/ConversationContext';
import { WorkbenchLayout } from '@/components/ai-workbench/WorkbenchLayout';
import HistorySidebar from '@/components/ai-workbench/HistorySidebar';
import ChatArea from '@/components/ai-workbench/ChatArea';

export default function AIWorkbenchPage() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null); // 清空当前对话，ChatArea会显示欢迎界面
  };

  return (
    <ConversationProvider>
      <WorkbenchLayout>
        <HistorySidebar
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        {currentConversationId ? (
          <ChatArea />
        ) : (
          <div className="flex-1 bg-white/80 backdrop-blur-md flex items-center justify-center">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-brand-800 mb-2">
                欢迎使用AI学习工作台
              </h3>
              <p className="text-sm text-brand-500 mb-4">
                从左侧选择对话或创建新对话开始学习
              </p>
              <div className="bg-brand-50 p-4 rounded-lg inline-block">
                <p className="text-xs text-brand-600">
                  💡 <span className="font-medium">提示：</span> 选择对话或点击"新对话"按钮
                </p>
              </div>
            </div>
          </div>
        )}
      </WorkbenchLayout>
    </ConversationProvider>
  );
}