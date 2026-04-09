'use client';

import { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getSupabase } from '@/lib/supabase';
import { getLive2DSettings, saveLive2DSettings, type Live2DSettings } from '@/lib/live2d-settings';
import {
  getConversationWithMessages,
  createConversation,
  addMessage,
  formatConversationHistory,
  getUserConversations,
  type AIConversation,
} from '@/lib/ai-memory-service';
import {
  getOrCreateUserAIProfile,
  updateUserAIProfile,
  getAvailableLLMs,
  getSelectedLLM,
  generateSystemPrompt,
  getLLMAPIConfig,
  addCustomLLM,
  deleteCustomLLM,
  type UserAIProfile,
  type LLMConfig,
} from '@/lib/llm-config-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [live2dSettings, setLive2DSettings] = useState<Live2DSettings | null>(null);
  const [userAIProfile, setUserAIProfile] = useState<UserAIProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showConfigAlert, setShowConfigAlert] = useState(false);
  const [databaseAvailable, setDatabaseAvailable] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 确保客户端挂载后初始化
  useEffect(() => {
    setMounted(true);

    const initializeApp = async () => {
      // 获取Live2D设置
      setLive2DSettings(getLive2DSettings());

      // 检查用户认证状态
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
          setUserId(user.id);

          // 获取用户AI配置
          const profile = getOrCreateUserAIProfile(user.id);
          setUserAIProfile(profile);

          // 如果还没有配置LLM或API Key，显示提示
          const llm = getSelectedLLM(user.id);
          const llmConfig = getLLMAPIConfig(user.id);
          if (!llm || !llmConfig || !llmConfig.apiKey) {
            setShowConfigAlert(true);
          }

          // 检查数据库是否可用，尝试加载对话列表
          const convs = await getUserConversations(user.id);
          if (convs.length > 0) {
            // 如果能加载到对话，说明数据库可用
            setDatabaseAvailable(true);
            setConversations(convs);

            // 尝试恢复最后活跃的对话
            await loadConversation(convs[0].id, user.id);
          } else {
            // 如果没有对话，不显示提示，这是正常的
            setDatabaseAvailable(true);
            setConversations([]);
          }
        }
      }
    };

    initializeApp();

    return () => {
      setMounted(false);
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 加载对话列表
  const loadConversations = async (uid: string) => {
    const convs = await getUserConversations(uid);
    setConversations(convs);
  };

  // 加载特定对话
  const loadConversation = async (conversationId: string, uid: string) => {
    const conversation = await getConversationWithMessages(conversationId, uid);
    if (conversation) {
      setCurrentConversation(conversation);

      // 格式化消息为界面显示格式
      const formattedMessages: Message[] = conversation.messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          image: msg.image_url,
        }));

      setMessages(formattedMessages);
    }
  };

  // 创建新对话
  const handleNewConversation = async () => {
    if (!userId) return;

    const newConversation = await createConversation(userId, '新对话');
    if (newConversation) {
      setCurrentConversation(newConversation);
      setMessages([]);
      await loadConversations(userId);
      setShowHistory(false);
    }
  };

  // 渲染 LaTeX 公式
  const renderLatex = (text: string) => {
    let result = text.replace(/\$([^$]+)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false });
      } catch {
        return match;
      }
    });

    result = result.replace(/\$\$([^$]+)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true });
      } catch {
        return match;
      }
    });

    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true });
      } catch {
        return match;
      }
    });

    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false });
      } catch {
        return match;
      }
    });

    return result;
  };

  const handleScreenshot = async () => {
    let video: HTMLVideoElement | null = null;
    let stream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('您的浏览器不支持屏幕截图功能，请使用上传图片功能');
        return;
      }

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      await new Promise<void>((resolve) => {
        video!.onloadedmetadata = () => {
          video!.play();
          resolve();
        };
      });

      await new Promise(r => setTimeout(r, 100));

      const canvas = document.createElement('canvas');
      canvas.width = video!.videoWidth;
      canvas.height = video!.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video!, 0, 0);
      }

      stream.getTracks().forEach(track => track.stop());

      const imageData = canvas.toDataURL('image/png');
      setScreenshot(imageData);

    } catch (error: any) {
      console.error('截图失败:', error);

      if (error.name === 'NotAllowedError') {
        alert('截图需要您授权屏幕共享权限。请在弹出的对话框中选择要分享的屏幕/窗口/标签页。');
      } else if (error.name === 'NotSupportedError') {
        alert('您的浏览器不支持此功能，请使用"上传图片"按钮代替。');
      } else if (error.name === 'NotFoundError') {
        alert('未找到可用的屏幕设备');
      } else {
        alert('截图失败: ' + (error.message || '请重试或使用上传图片功能'));
      }
    } finally {
      if (video) {
        video.srcObject = null;
        video.remove();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLive2DSettingChange = (key: keyof Live2DSettings, value: number | boolean) => {
    const newSettings = { ...live2dSettings, [key]: value };
    setLive2DSettings(newSettings);
    saveLive2DSettings(newSettings);
  };

  const handleSend = async () => {
    // 检查用户认证
    if (!isAuthenticated || !userId) {
      alert('请先登录后使用AI助手');
      return;
    }

    // 检查是否配置了LLM
    const llm = getSelectedLLM(userId);
    if (!llm) {
      setShowLLMSettings(true);
      return;
    }

    // 检查是否配置了API Key
    const llmConfig = getLLMAPIConfig(userId);
    if (!llmConfig) {
      console.error('LLM配置获取失败');
      alert('LLM配置获取失败，请重新选择模型');
      setShowLLMSettings(true);
      return;
    }

    if (!llmConfig.apiKey || llmConfig.apiKey.trim() === '') {
      console.error('API Key未配置:', llmConfig);
      alert('请先在AI设置中配置API Key');
      setShowLLMSettings(true);
      return;
    }

    console.log('使用LLM配置:', {
      provider: llmConfig.provider,
      model: llmConfig.model,
      hasApiKey: !!llmConfig.apiKey,
      apiKeyLength: llmConfig.apiKey?.length || 0
    });

    // 如果没有当前对话，创建新对话（仅在数据库可用时）
    let conversationId = currentConversation?.id;
    if (!conversationId && databaseAvailable) {
      const newConversation = await createConversation(userId, '新对话');
      if (!newConversation) {
        // 创建对话失败，仍然允许对话，只是不保存到数据库
        console.log('无法创建对话，将使用临时对话');
      } else {
        conversationId = newConversation.id;
        setCurrentConversation(newConversation);
        await loadConversations(userId);
      }
    }

    if (!input.trim() && !screenshot) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: screenshot || undefined
    };

    // 更新界面
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setScreenshot(null);
    setLoading(true);

    // 保存用户消息到数据库（仅在数据库可用时）
    if (conversationId) {
      await addMessage(conversationId, 'user', input, screenshot);
    }

    try {
      // 生成系统提示词
      const systemPrompt = generateSystemPrompt(userId);
      console.log('系统提示词长度:', systemPrompt.length);

      // 准备对话历史
      const conversation = await getConversationWithMessages(conversationId, userId);
      const history = conversation ? formatConversationHistory(conversation.messages) : [];
      console.log('对话历史长度:', history.length);

      // 使用之前获取的llmConfig
      console.log('准备API调用:', {
        hasQuestion: !!input,
        hasImage: !!screenshot,
        historyLength: history.length,
        model: llmConfig.model,
        provider: llmConfig.provider
      });

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          history: history,
          image: screenshot,
          systemPrompt: systemPrompt,
          llmConfig: llmConfig,
        }),
      });

      console.log('API响应状态:', response.status);

      const data = await response.json();
      console.log('API响应数据:', { hasAnswer: !!data.answer, answerLength: data.answer?.length || 0 });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || '抱歉，我暂时无法回答这个问题。'
      };

      // 更新界面
      setMessages(prev => [...prev, assistantMessage]);

      // 保存助手回复到数据库（仅在数据库可用时）
      if (conversationId) {
        await addMessage(conversationId, 'assistant', data.answer || '抱歉，我暂时无法回答这个问题。');

        // 如果是新对话的第一条消息，根据用户问题更新标题
        const updatedConversation = await getConversationWithMessages(conversationId, userId);
        if (updatedConversation && updatedConversation.messages.length <= 2) {
          const title = input.slice(0, 20) + (input.length > 20 ? '...' : '');
          const supabase = getSupabase();
          await supabase
            .from('ai_conversations')
            .update({ title })
            .eq('id', conversationId);
          await loadConversations(userId);
        }
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      alert('网络错误，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="fixed bottom-6 right-28 z-50 w-12 h-12 bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group border-2 border-brand-200"
          title="Live2D 设置"
        >
          <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
          title="AI 助手"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2-2H5a2 2 0 00-2-2V9z" />
          </svg>

          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-30" />
          )}
        </button>

        {isOpen && (
          <div className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 bottom-24 right-6 w-96">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center justify-between">
              <h3 className="text-white font-medium">AI 学习助手</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-xl font-bold text-brand-800 mb-2">请先登录</h2>
              <p className="text-sm text-brand-600 mb-4">登录后即可使用AI学习助手</p>
              <a
                href="/auth"
                className="inline-block px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                去登录
              </a>
            </div>
          </div>
        )}

        {showSettings && mounted && live2dSettings && <Live2DSettingsPanel
          live2dSettings={live2dSettings}
          onClose={() => setShowSettings(false)}
          onSettingChange={handleLive2DSettingChange}
        />}
      </>
    );
  }

  // 已登录状态
  return (
    <>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed bottom-6 right-28 z-50 w-12 h-12 bg-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group border-2 border-brand-200"
        title="Live2D 设置"
      >
        <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        title="AI 助手"
      >
        {isOpen ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2-2H5a2 2 0 00-2-2V9z" />
          </svg>
        )}

        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-30" />
        )}
      </button>

      {isOpen && (
        <div className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 bottom-24 right-6 w-96 sm:w-[600px]">
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {databaseAvailable && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-white/80 hover:text-white transition-colors"
                  title="对话历史"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </button>
              )}
              <h3 className="text-white font-medium">
                {showHistory ? '对话历史' : userAIProfile?.assistantName || 'AI 学习助手'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!showHistory && (
                <button
                  onClick={handleNewConversation}
                  className="text-white/80 hover:text-white transition-colors"
                  title="新建对话"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                title="关闭"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {databaseAvailable && showHistory ? (
            <ConversationHistoryPanel
              conversations={conversations}
              currentConversationId={currentConversation?.id}
              onSelectConversation={(id) => {
                if (userId) loadConversation(id, userId);
                setShowHistory(false);
              }}
              onNewConversation={handleNewConversation}
            />
          ) : (
            <>
              {showConfigAlert && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-4 rounded">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        首次使用需要配置API Key才能使用AI助手
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        在设置中配置千问API Key即可开始对话
                      </p>
                      <button
                        onClick={() => setShowLLMSettings(true)}
                        className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        去配置
                      </button>
                    </div>
                    <button
                      onClick={() => setShowConfigAlert(false)}
                      className="ml-auto -mx-1.5 -my-1.5 bg-blue-50 text-blue-500 rounded-lg focus:ring-2 focus:ring-blue-400 p-1.5 hover:bg-blue-200 inline-flex items-center justify-center h-8 w-8"
                    >
                      <span className="sr-only">关闭</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="h-[500px] overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-brand-500 text-sm py-8">
                    <p className="mb-2">你好呀！我是你的专属学习助手</p>
                    <p className="text-xs text-brand-400">可以问我题目、知识点，或者截图/上传图片提问</p>
                    <p className="text-xs text-brand-400">后续我会更新更多功能的！</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-brand-500 text-white'
                          : 'bg-brand-100 text-brand-800'
                      }`}>
                        {msg.image && (
                          <img src={msg.image} alt="截图" className="max-w-full rounded mb-2" />
                        )}
                        <div
                          className="whitespace-pre-wrap prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: msg.role === 'assistant' ? renderLatex(msg.content) : msg.content
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-brand-100 text-brand-800 rounded-lg px-3 py-2 text-sm">
                      <span className="animate-pulse">思考中...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {screenshot && (
                <div className="px-4 pb-2">
                  <div className="relative inline-block">
                    <img src={screenshot} alt="预览" className="h-16 rounded border border-brand-200" />
                    <button
                      onClick={() => setScreenshot(null)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 border-t border-brand-100">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={handleScreenshot}
                    className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                    title="屏幕截图"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 00-2 2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                    title="上传图片"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowLLMSettings(true)}
                    className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                    title="AI设置"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                    placeholder="输入问题..."
                    className="flex-1 px-3 py-2 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || (!input.trim() && !screenshot)}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed transition-colors"
                  >
                    发送
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showSettings && mounted && live2dSettings && <Live2DSettingsPanel
        live2dSettings={live2dSettings}
        onClose={() => setShowSettings(false)}
        onSettingChange={handleLive2DSettingChange}
      />}

      {showLLMSettings && userId && <LLMSettingsPanel
        userId={userId}
        userAIProfile={userAIProfile}
        onClose={() => setShowLLMSettings(false)}
        onUpdate={(updatedProfile) => {
          setUserAIProfile(updatedProfile);
          setShowLLMSettings(false);
          setShowConfigAlert(false);
        }}
      />}
    </>
  );
}

// Live2D设置面板组件
function Live2DSettingsPanel({ live2dSettings, onClose, onSettingChange }: {
  live2dSettings: Live2DSettings;
  onClose: () => void;
  onSettingChange: (key: keyof Live2DSettings, value: number | boolean) => void;
}) {
  return (
    <div className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 bottom-20 right-6 w-80">
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-medium">Live2D 设置</h3>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-brand-800 mb-1">显示看板娘</h4>
            <p className="text-xs text-brand-500">在页面上显示Live2D角色</p>
          </div>
          <button
            onClick={() => onSettingChange('visible', !live2dSettings.visible)}
            className={`relative w-14 h-8 rounded-full transition-colors ${live2dSettings.visible ? 'bg-brand-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${live2dSettings.visible ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-brand-800 mb-1">点击穿透</h4>
            <p className="text-xs text-brand-500">画布空白区域可点击到底层页面</p>
          </div>
          <button
            onClick={() => onSettingChange('enableClickThrough', !live2dSettings.enableClickThrough)}
            className={`relative w-14 h-8 rounded-full transition-colors ${live2dSettings.enableClickThrough ? 'bg-brand-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${live2dSettings.enableClickThrough ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-brand-800">画布宽度</h4>
            <span className="text-sm text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{live2dSettings.canvasWidth}px</span>
          </div>
          <input
            type="range"
            min="200"
            max="600"
            step="50"
            value={live2dSettings.canvasWidth}
            onChange={(e) => onSettingChange('canvasWidth', parseInt(e.target.value))}
            className="w-full h-2 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-brand-400">200px</span>
            <span className="text-xs text-brand-400">600px</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-brand-800">画布高度</h4>
            <span className="text-sm text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{live2dSettings.canvasHeight}px</span>
          </div>
          <input
            type="range"
            min="300"
            max="800"
            step="50"
            value={live2dSettings.canvasHeight}
            onChange={(e) => onSettingChange('canvasHeight', parseInt(e.target.value))}
            className="w-full h-2 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-brand-400">300px</span>
            <span className="text-xs text-brand-400">800px</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-brand-800">模型缩放</h4>
            <span className="text-sm text-brand-600 bg-brand-50 px-3 py-1 rounded-full">{live2dSettings.modelScale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={live2dSettings.modelScale}
            onChange={(e) => onSettingChange('modelScale', parseFloat(e.target.value))}
            className="w-full h-2 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-brand-400">0.05x</span>
            <span className="text-xs text-brand-400">0.5x</span>
          </div>
        </div>

        <button
          onClick={() => {
            const defaultSettings = {
              canvasWidth: 400,
              canvasHeight: 500,
              modelScale: 0.2,
              visible: true,
              enableClickThrough: true,
            };
            Object.entries(defaultSettings).forEach(([key, value]) => {
              onSettingChange(key as keyof Live2DSettings, value as number | boolean);
            });
          }}
          className="w-full px-4 py-2 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors text-sm font-medium"
        >
          重置为默认设置
        </button>
      </div>
    </div>
  );
}

// 对话历史面板组件
function ConversationHistoryPanel({ conversations, currentConversationId, onSelectConversation, onNewConversation }: {
  conversations: AIConversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}) {
  return (
    <div className="h-[500px] overflow-y-auto p-4">
      <button
        onClick={onNewConversation}
        className="w-full px-4 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors mb-4 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        新建对话
      </button>

      <div className="space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center text-brand-400 text-sm py-8">
            <p>🎉 开始你的第一个对话吧！</p>
            <p className="text-xs mt-2">对话会自动保存到你的历史记录中</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentConversationId === conversation.id
                  ? 'bg-brand-100 border-2 border-brand-300'
                  : 'bg-white border-2 border-brand-100 hover:bg-brand-50'
              }`}
            >
              <div className="font-medium text-brand-800 text-sm mb-1">{conversation.title}</div>
              <div className="text-xs text-brand-500">
                {new Date(conversation.updated_at).toLocaleDateString('zh-CN')} • {conversation.message_count || 0} 条消息
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// LLM设置面板组件
function LLMSettingsPanel({ userId, userAIProfile, onClose, onUpdate }: {
  userId: string;
  userAIProfile: UserAIProfile | null;
  onClose: () => void;
  onUpdate: (profile: UserAIProfile) => void;
}) {
  const [profile, setProfile] = useState<UserAIProfile | null>(userAIProfile);
  const [showCustomLLMForm, setShowCustomLLMForm] = useState(false);
  const [availableLLMs, setAvailableLLMs] = useState<LLMConfig[]>([]);
  const [newLLM, setNewLLM] = useState({
    name: '',
    provider: 'custom' as const,
    model: '',
    apiUrl: '',
    apiKey: '',
    maxTokens: 1000,
    temperature: 0.7,
  });

  useEffect(() => {
    if (userId) {
      setAvailableLLMs(getAvailableLLMs(userId));
      if (!profile) {
        setProfile(getOrCreateUserAIProfile(userId));
      }
    }
  }, [userId, profile]);

  const handleSave = () => {
    if (profile) {
      console.log('保存AI配置:', {
        assistantName: profile.assistantName,
        selectedLLMId: profile.selectedLLMId,
        hasQwenApiKey: !!(profile.apiKeys?.qwen),
        apiKeyLength: profile.apiKeys?.qwen?.length || 0
      });

      const updatedProfile = updateUserAIProfile(userId, profile);
      if (updatedProfile) {
        console.log('AI配置保存成功');
        onUpdate(updatedProfile);
      } else {
        console.error('AI配置保存失败');
        alert('配置保存失败，请重试');
      }
    }
  };

  const handleAddCustomLLM = () => {
    if (!newLLM.name || !newLLM.model || !newLLM.apiUrl || !newLLM.apiKey) {
      alert('请填写所有必需字段');
      return;
    }

    const addedProfile = addCustomLLM(userId, newLLM);
    if (addedProfile) {
      setProfile(addedProfile);
      setAvailableLLMs(getAvailableLLMs(userId));
      setShowCustomLLMForm(false);
      setNewLLM({
        name: '',
        provider: 'custom' as const,
        model: '',
        apiUrl: '',
        apiKey: '',
        maxTokens: 1000,
        temperature: 0.7,
      });
    }
  };

  const handleDeleteCustomLLM = (llmId: string) => {
    const updatedProfile = deleteCustomLLM(userId, llmId);
    if (updatedProfile) {
      setProfile(updatedProfile);
      setAvailableLLMs(getAvailableLLMs(userId));
    }
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-800">AI助手设置</h2>
          <button onClick={onClose} className="text-brand-600 hover:text-brand-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-lg font-semibold text-brand-800 mb-4">基本信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">助手名字</label>
                <input
                  type="text"
                  value={profile.assistantName}
                  onChange={(e) => setProfile({ ...profile, assistantName: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none"
                  placeholder="给你的AI助手起个名字"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">性格特点</label>
                <textarea
                  value={profile.assistantPersonality}
                  onChange={(e) => setProfile({ ...profile, assistantPersonality: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="描述AI助手的性格，如：友好、耐心、喜欢鼓励学生"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">回复风格</label>
                <select
                  value={profile.responseStyle}
                  onChange={(e) => setProfile({ ...profile, responseStyle: e.target.value as any })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none"
                >
                  <option value="formal">正式专业</option>
                  <option value="casual">随意轻松</option>
                  <option value="friendly">友好热情</option>
                  <option value="professional">学术严谨</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">语言设定</label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value as any })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none"
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">英语</option>
                  <option value="auto">自动检测</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">角色定位</label>
                <textarea
                  value={profile.assistantRole}
                  onChange={(e) => setProfile({ ...profile, assistantRole: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="AI助手的角色和定位，如：你是一个专业的学习助手，专门帮助学生理解和解决问题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">自定义提示词</label>
                <textarea
                  value={profile.customSystemPrompt || ''}
                  onChange={(e) => setProfile({ ...profile, customSystemPrompt: e.target.value })}
                  className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="额外的系统提示词，用于定制AI助手的行为"
                />
              </div>
            </div>
          </div>

          {/* LLM配置 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-brand-800">模型配置</h3>
              <button
                onClick={() => setShowCustomLLMForm(!showCustomLLMForm)}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加自定义模型
              </button>
            </div>

            {/* API Key配置区域 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API Key 配置
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    千问 Qwen API Key
                  </label>
                  <input
                    type="password"
                    value={profile.apiKeys?.qwen || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      apiKeys: { ...(profile.apiKeys || {}), qwen: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                    placeholder="请输入千问API Key"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    从阿里云DashScope获取API Key
                  </p>
                </div>
              </div>
            </div>

            {showCustomLLMForm && (
              <div className="bg-brand-50 rounded-lg p-4 mb-4 space-y-4">
                <h4 className="font-medium text-brand-800">添加自定义LLM</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="模型名称"
                    value={newLLM.name}
                    onChange={(e) => setNewLLM({ ...newLLM, name: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="模型ID (如: gpt-4)"
                    value={newLLM.model}
                    onChange={(e) => setNewLLM({ ...newLLM, model: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="API URL"
                    value={newLLM.apiUrl}
                    onChange={(e) => setNewLLM({ ...newLLM, apiUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
                  />
                  <input
                    type="password"
                    placeholder="API Key"
                    value={newLLM.apiKey}
                    onChange={(e) => setNewLLM({ ...newLLM, apiKey: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomLLM}
                      className="flex-1 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => setShowCustomLLMForm(false)}
                      className="flex-1 px-3 py-2 bg-white text-brand-600 border border-brand-200 rounded-lg text-sm hover:bg-brand-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {availableLLMs.map((llm) => {
                const hasApiKey = llm.provider === 'custom'
                  ? !!llm.apiKey
                  : !!(profile.apiKeys?.[llm.provider]);

                return (
                  <div
                    key={llm.id}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      profile.selectedLLMId === llm.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-brand-200 hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="radio"
                            name="llm"
                            checked={profile.selectedLLMId === llm.id}
                            onChange={() => setProfile({ ...profile, selectedLLMId: llm.id })}
                            className="w-4 h-4 text-brand-600"
                          />
                          <span className="font-medium text-brand-800">{llm.name}</span>
                          {llm.isDefault && (
                            <span className="text-xs bg-brand-200 text-brand-800 px-2 py-0.5 rounded">默认</span>
                          )}
                          {!hasApiKey && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">需要API Key</span>
                          )}
                        </div>
                        <div className="text-sm text-brand-600">
                          模型: {llm.model} | 温度: {llm.temperature} | 最大令牌: {llm.maxTokens}
                        </div>
                      </div>
                      {llm.provider === 'custom' && (
                        <button
                          onClick={() => handleDeleteCustomLLM(llm.id)}
                          className="text-red-500 hover:text-red-700"
                          title="删除自定义模型"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 transition-all text-lg font-medium shadow-lg"
          >
            保存设置
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white text-brand-600 rounded-xl hover:bg-brand-50 border-2 border-brand-200 transition-all text-lg font-medium"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}