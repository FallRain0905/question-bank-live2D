'use client';

import { useState, useEffect } from 'react';
import { getConversations, createConversation, type AIConversation } from '@/lib/ai-memory-service';

interface HistorySidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export default function HistorySidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation
}: HistorySidebarProps) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // 使用localStorage中的用户ID（临时方案）
      const userId = localStorage.getItem('temp_user_id') || 'demo_user';
      const convs = await getConversations(userId);
      setConversations(convs);
    } catch (error) {
      console.error('加载对话历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const userId = localStorage.getItem('temp_user_id') || 'demo_user';
      const newConv = await createConversation(userId, '新对话');
      setConversations([newConv, ...conversations]);
      onSelectConversation(newConv.id);
    } catch (error) {
      console.error('创建对话失败:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-64 bg-white border-r border-brand-200 h-full flex flex-col">
      {/* 侧边栏头部 */}
      <div className="p-4 border-b border-brand-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-brand-800">对话历史</h2>
          <button
            onClick={handleNewConversation}
            className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            title="新建对话"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H12M12 4v16m8-8H12" />
            </svg>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索对话..."
            className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-brand-500">加载中...</div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💬</div>
            <div className="text-sm text-brand-500">暂无对话</div>
            <div className="text-xs text-brand-400 mt-2">点击上方按钮创建新对话</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-brand-50 border-2 border-brand-300'
                    : 'bg-white border-2 border-brand-100 hover:bg-brand-50'
                }`}
              >
                <div className="mb-1">
                  <div className="font-medium text-brand-800 text-sm truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-brand-400">
                    {formatDate(conv.updated_at)}
                  </div>
                </div>
                <div className="text-xs text-brand-500">
                  {conv.message_count || 0} 条消息
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}