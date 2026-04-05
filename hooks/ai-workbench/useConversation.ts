'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConversations, createConversation, type AIConversation, type AIMessage } from '@/lib/ai-memory-service';
import { getLLMAPIConfig, generateSystemPrompt } from '@/lib/llm-config-service';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export interface ConversationContext {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
}

export function useConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // 临时用户ID（可以后续升级为真实认证）
  const userId = localStorage.getItem('temp_user_id') || 'demo_user';

  const loadConversation = useCallback(async (convId: string) => {
    try {
      setLoading(true);
      setMessages([]);

      // 获取对话历史（临时使用localStorage）
      const storedMessages = localStorage.getItem(`messages_${convId}`);
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages);
        setMessages(parsed);
      } else {
        setMessages([]);
      }

      setConversationId(convId);
    } catch (error) {
      console.error('加载对话失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation(userId, '新对话');
      const initialMessage: Message = {
        role: 'assistant',
        content: '你好呀！我是你的专属学习助手。可以问我题目、知识点，或者截图/上传图片提问。后续我会更新更多功能的！',
        timestamp: Date.now()
      };

      setMessages([initialMessage]);
      setConversationId(newConv.id);
      localStorage.setItem(`messages_${newConv.id}`, JSON.stringify([initialMessage]));
    } catch (error) {
      console.error('创建对话失败:', error);
    }
  }, [userId]);

  const addMessage = useCallback((message: Omit<Message, 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMessage]);

    // 保存到localStorage（临时方案）
    if (conversationId) {
      const storedMessages = JSON.parse(localStorage.getItem(`messages_${conversationId}`) || '[]');
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify([...storedMessages, newMessage]));
    }
  }, [conversationId]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    conversationId,
    messages,
    loading,
    loadConversation,
    createNewConversation,
    addMessage,
    clearConversation
  };
}