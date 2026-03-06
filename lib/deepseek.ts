// 本地存储的聊天消息类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'ai_chat_sessions';
const CURRENT_SESSION_KEY = 'ai_current_session_id';

// 默认系统提示词
export const DEFAULT_SYSTEM_PROMPT = `你是一个友善、专业的学习助手，帮助用户解答学习相关的问题。

你的职责：
1. 耐心解答学习中的疑问
2. 提供清晰、准确的解释
3. 引导用户思考和理解
4. 鼓励和激励用户保持学习热情

回答时请注意：
- 用简洁明了的语言
- 适当使用emoji增加亲和力
- 对于不确定的内容，诚实说明
- 避免过于冗长的回答`;

// 生成唯一ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取所有聊天会话
export function getChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// 保存聊天会话
export function saveChatSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save chat sessions:', error);
  }
}

// 获取当前会话ID
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CURRENT_SESSION_KEY);
  } catch {
    return null;
  }
}

// 设置当前会话ID
export function setCurrentSessionId(sessionId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (error) {
    console.error('Failed to save current session ID:', error);
  }
}

// 创建新会话
export function createChatSession(title?: string): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    title: title || '新对话',
    messages: [
      {
        id: generateId(),
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sessions = getChatSessions();
  sessions.unshift(session);
  saveChatSessions(sessions);
  setCurrentSessionId(session.id);

  return session;
}

// 获取指定会话
export function getChatSession(sessionId: string): ChatSession | null {
  const sessions = getChatSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

// 更新会话
export function updateChatSession(sessionId: string, updates: Partial<ChatSession>): void {
  const sessions = getChatSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates, updatedAt: Date.now() };
    saveChatSessions(sessions);
  }
}

// 添加消息到会话
export function addMessageToSession(sessionId: string, role: 'user' | 'assistant', content: string): ChatMessage {
  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };

  const session = getChatSession(sessionId);
  if (session) {
    // 更新会话标题（如果这是第一条用户消息）
    if (role === 'user' && session.messages.length === 1) {
      const title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      updateChatSession(sessionId, { title });
    }

    session.messages.push(message);
    updateChatSession(sessionId, { messages: session.messages });
  }

  return message;
}

// 删除会话
export function deleteChatSession(sessionId: string): void {
  const sessions = getChatSessions().filter(s => s.id !== sessionId);
  saveChatSessions(sessions);

  // 如果删除的是当前会话，清除当前会话ID
  if (getCurrentSessionId() === sessionId) {
    const remainingSessions = getChatSessions();
    if (remainingSessions.length > 0) {
      setCurrentSessionId(remainingSessions[0].id);
    } else {
      setCurrentSessionId(null);
    }
  }
}

// 清空会话消息
export function clearSessionMessages(sessionId: string): void {
  const session = getChatSession(sessionId);
  if (session) {
    const messages: ChatMessage[] = [
      {
        id: generateId(),
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
        timestamp: Date.now(),
      },
    ];
    updateChatSession(sessionId, { messages, title: '新对话' });
  }
}
