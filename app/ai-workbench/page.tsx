'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getSupabase } from '@/lib/supabase';
import {
  getOrCreateUserAIProfile,
  getLLMAPIConfig,
  generateSystemPrompt,
  supportsVision,
  getVisionModel,
  switchToVisionModel,
  getAvailableLLMs,
  getSelectedLLM,
  getUserAIProfile,
  type UserAIProfile,
} from '@/lib/llm-config-service';
import {
  generateMemoryContext,
  generateInnerThoughts,
  saveConversationMemories,
} from '@/lib/memory-service';
import { parseUploadedFile, prepareFileForAI, getFileIcon, type ParsedFile } from '@/lib/file-parser';
import UnifiedModelSelector from '@/components/ai-workbench/UnifiedModelSelector';
import AISettingsPanel from '@/components/ai-workbench/AISettingsPanel';
import FileUploader from '@/components/ai-workbench/FileUploader';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

export default function AIWorkbenchPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userAIProfile, setUserAIProfile] = useState<UserAIProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showInnerThoughts, setShowInnerThoughts] = useState(false);
  const [innerThoughts, setInnerThoughts] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<ParsedFile | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // localStorage key for conversations
  const CONVERSATIONS_KEY = 'ai_workbench_conversations';

  // 加载对话历史
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem(CONVERSATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  };

  // 保存对话历史到localStorage
  const saveConversations = (convs: Conversation[]) => {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
  };

  // 初始化加载
  useEffect(() => {
    const initializeApp = async () => {
      // 加载对话历史
      loadConversations();

      // 获取用户信息和AI配置
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const profile = getOrCreateUserAIProfile(user.id);
          setUserAIProfile(profile);
        }
      }
    };
    initializeApp();
  }, []);

  // 自动保存对话历史到localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const handleSendMessage = async () => {
    if (!userId) {
      alert('请先登录后使用AI工作台');
      return;
    }

    // 检查是否配置了LLM
    const llmConfig = getLLMAPIConfig(userId);
    if (!llmConfig || !llmConfig.apiKey) {
      alert('请先在AI设置中配置API Key');
      setShowSettings(true);
      return;
    }

    // 准备消息内容
    let messageContent = input.trim();

    // 如果有上传的文件，将文件内容合并到消息中
    if (uploadedFile) {
      const { contentForAI } = prepareFileForAI(uploadedFile);
      messageContent = `${contentForAI}\n\n${messageContent}`;
      setUploadedFile(null); // 发送后清除上传的文件
    }

    if (messageContent.trim()) {
      const newMessage: Message = {
        role: 'user',
        content: messageContent,
        timestamp: Date.now(),
      };
      // 添加消息到当前对话
      setCurrentMessages([...currentMessages, newMessage]);

      // 更新对话列表中的消息
      if (selectedConversationId) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversationId
              ? { ...conv, messages: [...conv.messages, newMessage] }
              : conv
          )
        );
      }
      setInput('');

      // 使用真实AI服务
      setLoading(true);
      try {
        // 生成记忆上下文
        const memoryContext = await generateMemoryContext(userId);
        const thoughts = generateInnerThoughts(userAIProfile?.assistantName || '同学', []);

        // 显示内心活动
        if (thoughts && !showInnerThoughts) {
          setInnerThoughts(thoughts);
          setShowInnerThoughts(true);
          setTimeout(() => setShowInnerThoughts(false), 5000); // 5秒后隐藏
        }

        // 生成系统提示词（包含记忆上下文）
        const systemPrompt = generateSystemPrompt(userId, memoryContext);

        // 准备对话历史
        const chatMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...currentMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: newMessage.content },
        ];

        // 调用AI API
        const response = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: newMessage.content,
            history: chatMessages.slice(1),
            systemPrompt: systemPrompt,
            llmConfig: llmConfig,
          }),
        });

        if (!response.ok) {
          throw new Error(`API调用失败: ${response.status}`);
        }

        const data = await response.json();

        const aiResponse: Message = {
          role: 'assistant',
          content: data.answer || '抱歉，我暂时无法回答这个问题。',
          timestamp: Date.now(),
        };

        setCurrentMessages(prev => [...prev, aiResponse]);

        // 更新对话列表中的消息
        if (selectedConversationId) {
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedConversationId
                ? { ...conv, messages: [...conv.messages, aiResponse] }
                : conv
            )
          );
        }

      } catch (error: any) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `发生错误：${error instanceof Error ? error.message : '未知错误'}`,
          timestamp: Date.now(),
        };

        // 添加错误消息到当前对话
        setCurrentMessages(prev => [...prev, errorMessage]);

        // 更新对话列表中的消息
        if (selectedConversationId) {
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedConversationId
                ? { ...conv, messages: [...conv.messages, errorMessage] }
                : conv
            )
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: '新对话',
      createdAt: Date.now(),
      messages: [],
    };
    setConversations([newConv, ...conversations]);
    setSelectedConversationId(newConv.id);
    setCurrentMessages([]);
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConversationId(convId);
    const selectedConv = conversations.find(conv => conv.id === convId);
    if (selectedConv) {
      setCurrentMessages([...selectedConv.messages]);
    }
  };

  const handleDeleteConversation = (convId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 防止触发选择对话

    if (confirm('确定要删除这个对话吗？')) {
      setConversations(prev => prev.filter(conv => conv.id !== convId));

      // 如果删除的是当前对话，清空消息或选择第一个对话
      if (convId === selectedConversationId) {
        if (conversations.length > 1) {
          const nextConv = conversations.find(conv => conv.id !== convId);
          if (nextConv) {
            handleSelectConversation(nextConv.id);
          }
        } else {
          setSelectedConversationId(null);
          setCurrentMessages([]);
        }
      }
    }
  };

  const handleStartEditTitle = (convId: string, currentTitle: string) => {
    setEditingConversationId(convId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = () => {
    if (editingConversationId && editingTitle.trim()) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === editingConversationId
            ? { ...conv, title: editingTitle.trim() }
            : conv
        )
      );
    }
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 自动调整textarea高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // 自动滚动到消息底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, loading]);

  // 结束对话并保存记忆
  const handleEndConversation = async () => {
    if (selectedConversationId && currentMessages.length > 0) {
      try {
        // 保存学习记忆
        await saveConversationMemories(userId!, currentMessages);
        console.log('对话记忆已保存');
        alert('学习记忆已保存！');
      } catch (error) {
        console.error('保存对话记忆失败:', error);
      }
    }
  };

  // 渲染 LaTeX 公式
  const renderLatex = (text: string) => {
    // 处理行内公式 $...$
    let result = text.replace(/\$([^$]+)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false });
      } catch {
        return match;
      }
    });

    // 处理块级公式 $$...$$
    result = result.replace(/\$\$([^$]+)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex, { throwOnError: false, displayMode: true });
      } catch {
        return match;
      }
    });

    // 处理 \[...\] 和 \(...\)
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

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setParsingFile(true);
    try {
      const parsedFile = await parseUploadedFile(file);
      setUploadedFile(parsedFile);
      setShowFileUploader(false);

      // 如果是图片文件，检查当前模型是否支持视觉功能
      if (parsedFile.fileType === 'image' && userId) {
        const currentLLM = userAIProfile?.selectedLLMId
          ? getAvailableLLMs(userId).find(llm => llm.id === userAIProfile.selectedLLMId)
          : null;

        if (!supportsVision(currentLLM)) {
          const visionModel = getVisionModel(userId);
          if (visionModel) {
            const confirmSwitch = confirm(
              `当前模型不支持图片识别。\n\n是否切换到 "${visionModel.name}" 来处理图片？\n\n取消将只上传文件的基本信息。`
            );

            if (confirmSwitch) {
              const updatedProfile = switchToVisionModel(userId);
              if (updatedProfile) {
                setUserAIProfile(updatedProfile);
              } else {
                alert('无法切换到支持视觉的模型');
              }
            } else {
              // 用户取消，移除图片文件
              setUploadedFile(null);
              alert('已取消图片上传，当前模型不支持图片识别功能。');
              setParsingFile(false);
              return;
            }
          } else {
            alert('没有找到支持视觉的模型。请在AI设置中配置支持图片识别的模型。');
            setUploadedFile(null);
            setParsingFile(false);
            return;
          }
        }
      }

      // 注意：现在不自动发送给AI，只显示在对话框预览区
      // 用户需要点击发送按钮时才会将文件内容和文字一起发送
    } catch (error: any) {
      console.error('文件解析失败:', error);
      alert(`文件解析失败：${error.message || error}`);
    } finally {
      setParsingFile(false);
    }
  };


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
          {/* 模型选择器 */}
          {userId && (
            <UnifiedModelSelector
              userId={userId}
              compact={true}
            />
          )}

          <button
            onClick={() => setShowFileUploader(true)}
            className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
            disabled={parsingFile}
            title="上传文件后可继续输入文字，然后一起发送给AI"
          >
            📎 上传文件
          </button>
          <button
            onClick={handleEndConversation}
            className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
            disabled={!selectedConversationId || currentMessages.length === 0}
          >
            💾 保存记忆
          </button>
          <button
            onClick={() => {
              const currentLLM = getSelectedLLM(userId || '');
              const config = getLLMAPIConfig(userId || '');
              const profile = getUserAIProfile(userId || '');
              alert(`当前模型配置：\n\n模型名称: ${currentLLM?.name}\n模型ID: ${currentLLM?.model}\n提供商: ${currentLLM?.provider}\nAPI URL: ${config?.apiUrl}\n有API Key: ${!!config?.apiKey}\n\n用户配置: ${JSON.stringify(profile?.selectedLLMId, null, 2)}`);
            }}
            className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            🔍 调试配置
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            ⚙️ AI设置
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧对话历史 */}
        <div className="w-64 bg-white border-r border-brand-200 flex flex-col">
          <div className="p-4 border-b border-brand-200">
            <button
              onClick={handleNewConversation}
              className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              + 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-2">
              <h3 className="text-xs font-semibold text-brand-500 mb-2">对话历史</h3>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`relative group mb-1`}
                >
                  {editingConversationId === conv.id ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-brand-100 rounded-lg">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        autoFocus
                        className="flex-1 text-sm bg-transparent outline-none"
                      />
                      <button
                        onClick={handleSaveTitle}
                        className="text-brand-500 hover:text-brand-700 p-1"
                        title="保存"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7l-10 14l-11-5 12 12" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="取消"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSelectConversation(conv.id)}
                        onDoubleClick={() => handleStartEditTitle(conv.id, conv.title)}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedConversationId === conv.id
                            ? 'bg-brand-100 text-brand-800'
                            : 'hover:bg-brand-50 text-brand-600'
                        }`}
                      >
                        <div className="text-sm font-medium truncate">{conv.title}</div>
                        <div className="text-xs text-brand-400 mt-0.5">{formatDate(conv.createdAt)}</div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditTitle(conv.id, conv.title);
                        }}
                        className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-brand-500 hover:text-brand-700 p-1"
                        title="重命名"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v2a2 2 0 00 2 2V3a2 2 0 002 2h11a2 2 0 002 2V3a2 2 0 00-2 0 2 6a2 2 0 002 2v11a2 2 0 00-2 0 2 2H4a2 2 0 00-2 2V9a2 2 0 002 2H6a2 2 0 00-2 2V3a2 2 0 002 2h2a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id, e);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
                        title="删除对话"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 012-2v-2.586a2 2 0 0116-2.5L7 17a2 2 0 002-2h-11a2 2 0 00-2 2 0 002 2h-5a2 2 0 00-2 2 4m6a2 2 0 00-2.618" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧对话区域 */}
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-md">
          {/* 文件上传器 */}
          {showFileUploader && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-brand-800">上传文件</h3>
                  <button
                    onClick={() => setShowFileUploader(false)}
                    className="text-brand-600 hover:text-brand-800"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FileUploader
                  onFileUpload={handleFileUpload}
                  loading={parsingFile}
                />
              </div>
            </div>
          )}

          {/* 已上传文件显示 */}
          {uploadedFile && (
            <div className="bg-brand-50 border-l-4 border-brand-400 p-3 m-4 rounded-r-lg animate-in slide-in-from-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getFileIcon(uploadedFile.fileName)}</span>
                  <div>
                    <div className="text-sm font-medium text-brand-800">{uploadedFile.fileName}</div>
                    <div className="text-xs text-brand-500">
                      {uploadedFile.metadata?.wordCount && `${uploadedFile.metadata.wordCount} 字`}
                      {uploadedFile.metadata?.pageCount && ` · ${uploadedFile.metadata.pageCount} 页`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-brand-500 hover:text-brand-700"
                  title="移除文件"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-brand-600 mt-2">
                📎 文件已准备就绪，请在下方输入相关问题或说明，然后点击发送
              </p>
            </div>
          )}

          {/* 内心活动显示 */}
          {showInnerThoughts && (
            <div className="bg-purple-50 border-l-4 border-purple-400 p-3 m-4 rounded-r-lg animate-in slide-in-from-top">
              <div className="text-xs text-purple-600 font-medium mb-1">💭 内心活动</div>
              <div className="text-sm text-purple-800">{innerThoughts}</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-bold text-brand-800 mb-2">
                    {selectedConversationId ? '开始新的对话' : '欢迎使用AI学习工作台'}
                  </h3>
                  <p className="text-sm text-brand-500 mb-4">
                    {selectedConversationId ? '上传文件后可继续输入文字说明，然后点击发送' : '选择对话或创建新对话'}
                  </p>
                  {!selectedConversationId && (
                    <div className="space-y-3">
                      <div className="bg-brand-50 p-4 rounded-lg inline-block">
                        <p className="text-xs text-brand-600">
                          💡 <span className="font-medium">提示：</span> 点击右上角"AI设置"配置API Key
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg inline-block">
                        <p className="text-xs text-blue-600">
                          📎 <span className="font-medium">文件上传：</span> 支持 .md, .txt, .pdf, .docx 及图片
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              currentMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white'
                      : 'bg-brand-100 text-brand-800'
                  }`}>
                    <div
                      className="text-sm whitespace-pre-wrap break-words"
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
                <div className="bg-brand-100 text-brand-800 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 border-t border-brand-200">
            <div className="flex gap-2 mb-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={uploadedFile ? "输入相关问题或说明，然后点击发送（已包含文件内容）..." : "输入问题或学习内容..."}
                disabled={loading}
                rows={1}
                className="flex-1 px-4 py-3 bg-brand-50 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none text-sm resize-none transition-all placeholder:text-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px', maxHeight: '200px' }}
              />
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1 text-xs text-brand-400">
                按 Enter 发送，Shift + Enter 换行
              </div>
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed transition-all font-medium text-sm"
              >
                {loading ? '发送中...' : '发送'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI设置面板 */}
      {showSettings && userId && (
        <AISettingsPanel
          userId={userId}
          userAIProfile={userAIProfile}
          onClose={() => setShowSettings(false)}
          onUpdate={(updatedProfile) => {
            setUserAIProfile(updatedProfile);
          }}
        />
      )}
    </div>
  );
}
