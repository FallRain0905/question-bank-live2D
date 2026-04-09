'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { useConversationContext } from '@/contexts/ai-workbench/ConversationContext';

interface InputAreaProps {
  onSendMessage: (content: string, image?: string) => void;
  loading?: boolean;
}

export default function InputArea({ onSendMessage, loading }: InputAreaProps) {
  const [input, setInput] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleSend = () => {
    if (input.trim() || uploadedImage) {
      onSendMessage(input.trim(), uploadedImage || undefined);
      setInput('');
      setUploadedImage(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Show shortcuts on Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowShortcuts(true);
    }

    // Close shortcuts on Escape
    if (e.key === 'Escape') {
      setShowShortcuts(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For demo, we'll use FileReader to get a base64 string
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const shortcuts = [
    { key: 'Enter', description: '发送消息' },
    { key: 'Shift + Enter', description: '换行' },
    { key: 'Ctrl + K', description: '显示快捷键' },
    { key: 'Escape', description: '关闭快捷键' },
  ];

  const features = [
    { icon: '📝', title: '文本输入', description: '支持多行文本输入' },
    { icon: '📷', title: '图片上传', description: '支持图片识别和解析' },
    { icon: '📄', title: '文档处理', description: '支持Word/PDF文档解析' },
    { icon: '🎯', title: '技能调用', description: '智能识别并调用相关技能' },
  ];

  return (
    <div className="bg-white border-t border-brand-200 p-4 relative">
      {/* 快捷键提示 */}
      {showShortcuts && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl border border-brand-200 shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-brand-800">键盘快捷键</h4>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-brand-500 hover:text-brand-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.key} className="flex items-start gap-2 text-sm">
                <kbd className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-mono">
                  {shortcut.key}
                </kbd>
                <span className="text-brand-600">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 功能特性提示 */}
      {input.length === 0 && !uploadedImage && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl border border-brand-200 shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-brand-800">✨ 功能特性</h4>
            <button
              onClick={() => setShowShortcuts(true)}
              className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              快捷键
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-center gap-2">
                <span className="text-lg">{feature.icon}</span>
                <div>
                  <div className="text-xs font-medium text-brand-800">{feature.title}</div>
                  <div className="text-xs text-brand-600">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图片预览 */}
      {uploadedImage && (
        <div className="mb-3 relative inline-block">
          <img
            src={uploadedImage}
            alt="上传的图片"
            className="max-h-32 rounded-lg border border-brand-200"
          />
          <button
            onClick={() => setUploadedImage(null)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题或学习内容，支持LaTeX公式：$E=mc^2$..."
            disabled={loading}
            rows={1}
            className="w-full px-4 py-3 pr-24 bg-brand-50 border border-brand-200 rounded-xl focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none text-sm resize-none transition-all placeholder:text-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '200px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
            }}
          />

          {/* 附件按钮 */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.doc,.docx,.pdf,.txt"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
              title="上传文件"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
              title="快捷键"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={loading || (!input.trim() && !uploadedImage)}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              <span>发送中</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>发送</span>
            </>
          )}
        </button>
      </div>

      {/* LaTeX提示 */}
      <div className="mt-2 text-xs text-brand-400 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        支持LaTeX数学公式，使用$E=mc^2$表示行内公式，$$\frac{a}{b}$$表示块级公式
      </div>
    </div>
  );
}
