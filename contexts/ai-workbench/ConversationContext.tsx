'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Message } from '@/hooks/ai-workbench/useConversation';

interface ConversationContextValue {
  currentConversationId: string | null;
  messages: Message[];
  loading: boolean;
  // Actions
  selectConversation: (id: string) => void;
  clearConversation: () => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // 清理逻辑（示例）
  useEffect(() => {
    console.log('对话上下文初始化');
  }, []);

  return (
    <ConversationContext.Provider value={{
      currentConversationId,
      messages,
      loading,
      selectConversation: setCurrentConversationId,
      clearConversation: () => {
        setMessages([]);
        setCurrentConversationId(null);
      }
    }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within ConversationProvider');
  }
  return context;
}
