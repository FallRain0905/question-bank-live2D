'use client';

import { useState, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const handleScreenshot = async () => {
    try {
      // 检查浏览器是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('您的浏览器不支持屏幕截图功能，请使用上传图片功能');
        return;
      }

      // 请求屏幕共享权限
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // 创建 video 元素来捕获画面
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // 等待视频加载
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      // 等待一帧确保画面已渲染
      await new Promise(r => setTimeout(r, 100));

      // 绘制到 canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }

      // 停止所有轨道
      stream.getTracks().forEach(track => track.stop());

      // 转换为 base64
      const imageData = canvas.toDataURL('image/png');
      setScreenshot(imageData);

    } catch (error: any) {
      console.error('截图失败:', error);

      // 根据错误类型给出提示
      if (error.name === 'NotAllowedError') {
        alert('截图需要您授权屏幕共享权限。请在弹出的对话框中选择要分享的屏幕/窗口/标签页。');
      } else if (error.name === 'NotSupportedError') {
        alert('您的浏览器不支持此功能，请使用"上传图片"按钮代替。');
      } else if (error.name === 'NotFoundError') {
        alert('未找到可用的屏幕设备');
      } else {
        alert('截图失败: ' + (error.message || '请重试或使用上传图片功能'));
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

  const handleSend = async () => {
    if (!input.trim() && !screenshot) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      image: screenshot || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setScreenshot(null);
    setLoading(true);

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          image: screenshot
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer || '抱歉，我暂时无法回答这个问题。'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTimeout(scrollToBottom, 100);

    } catch (error) {
      console.error('登录/注册失败:', error);
      alert('网络错误，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 浮动按钮 - 固定位置 */}
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

        {/* 脉冲动画 */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-30" />
        )}
      </button>

      {/* 对话框 */}
      {isOpen && (
        <div className="fixed z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 bottom-24 right-6 w-96 sm:w-[600px]">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 学习助手
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              title="关闭"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6L6 18M18 6l12 12M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 消息列表 */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-brand-500 text-sm py-8">
                <p className="mb-2">👋 你好！我是你的学习助手</p>
                <p className="text-xs text-brand-400">可以问我题目、知识点，或者截图/上传图片提问</p>
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

          {/* 截图预览 */}
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

          {/* 输入区 */}
          <div className="p-4 border-t border-brand-100">
            <div className="flex gap-2 mb-2">
              {/* 截图按钮 */}
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

              {/* 上传图片按钮 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                title="上传图片"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
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
        </div>
      )}
    </>
  );
}