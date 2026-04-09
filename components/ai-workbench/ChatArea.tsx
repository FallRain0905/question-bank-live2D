'use client';

import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useConversationContext } from '@/contexts/ai-workbench/ConversationContext';
import { getSelectedLLM, getAvailableLLMs, saveSelectedLLM, type LLMModel } from '@/lib/llm-config-service';
import ModelSelector from './ModelSelector';
import InputArea from './InputArea';

export default function ChatArea() {
  const { messages, loading } = useConversationContext();
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);

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

  // 简单的代码高亮（基础实现）
  const highlightCode = (text: string) => {
    const codePattern = /```(\w+)?\n([\s\S]*?)\n```/g;
    return text.replace(codePattern, '<pre class="bg-gray-100 p-2 rounded overflow-x-auto"><code>$1</code></pre>');
  };

  // 复制消息内容
  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(index);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  // 重新生成消息
  const handleRegenerate = (index: number) => {
    // TODO: 集成AI重新生成功能
    console.log('重新生成消息:', index);
  };

  // 删除消息
  const handleDeleteMessage = (index: number) => {
    // TODO: 集成消息删除功能
    console.log('删除消息:', index);
  };

  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(getSelectedLLM('demo_user'));
  const userId = 'demo_user'; // 临时用户ID

  // 发送消息处理
  const handleSendMessage = (content: string, image?: string) => {
    // TODO: 集成消息发送功能
    console.log('发送消息:', content, image);
    const { addMessage } = useConversationContext();
    if (content) {
      // 这里需要实际的发送逻辑，暂时打印
      console.log('消息已发送:', content);
    }
  };

  return (
    <div className="flex-1 bg-white/80 backdrop-blur-md flex flex-col">
      {/* 顶部区域 - 模型选择器和操作按钮 */}
      <div className="bg-white border-b border-brand-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-500 font-medium">AI模型</span>
          <ModelSelector
            userId={userId}
            onModelChange={(model) => setSelectedModel(model)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导出对话
          </button>
          <button className="text-sm text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清空对话
          </button>
        </div>
      </div>

      {/* 消息滚动区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-brand-800 mb-2">
              开始你的AI学习之旅
            </h3>
            <p className="text-sm text-brand-500 mb-4">
              💡 <span className="font-medium">功能亮点：</span>
            </p>
            <div className="text-left space-y-2 max-w-md mx-auto">
              <div className="bg-brand-50 p-3 rounded-lg flex items-start gap-3">
                <div className="text-2xl">📚</div>
                <div>
                  <p className="font-medium text-brand-800">智能题目解析</p>
                  <p className="text-xs text-brand-600">上传Word/PDF文档，自动提取题目和答案</p>
                </div>
              </div>
              <div className="bg-brand-50 p-3 rounded-lg flex items-start gap-3">
                <div className="text-2xl">🤖</div>
                <div>
                  <p className="font-medium text-brand-800">AI对话助手</p>
                  <p className="text-xs text-brand-600">个性化AI配置，支持多模型选择</p>
                </div>
              </div>
              <div className="bg-brand-50 p-3 rounded-lg flex items-start gap-3">
                <div className="text-2xl">📝</div>
                <div>
                  <p className="font-medium text-brand-800">学习计划生成</p>
                  <p className="text-xs text-brand-600">基于对话内容自动生成学习计划</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 relative ${
                    msg.role === 'user'
                      ? 'bg-brand-500 text-white'
                      : 'bg-brand-100 text-brand-800'
                  }`}
                >
                  {copiedMessage === index && (
                    <div className="absolute -top-1 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                      ✓ 已复制
                    </div>
                  )}

                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="用户上传的图片"
                      className="max-w-full rounded mb-2"
                    />
                  )}

                  <div
                    className="prose prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: msg.role === 'assistant' ? highlightCode(renderLatex(msg.content)) : msg.content
                    }}
                  />
                </div>

                {/* 消息操作按钮 */}
                <div className="absolute -top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopyMessage(msg.content, index)}
                    className="p-1.5 bg-white/90 hover:bg-white border border-brand-200 rounded-lg transition-colors"
                    title="复制"
                  >
                    <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2 2v6a2 2 0 00-2 2h6a2 2 0 00-2 2V8a2 2 0 00-2-002.828 4.828V6.115a4.465a4.465 0L11.535 6.115a4.465 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRegenerate(index)}
                    className="p-1.5 bg-white/90 hover:bg-white border border-brand-200 rounded-lg transition-colors"
                    title="重新生成"
                  >
                    <svg className="w-3 h-3 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16m-1.988 1.988-1.988H9a2 2 0 00-2 2v4M3 12a2 2 0 00-2 2V9.41l3 12 3.12a2 2 0 00.706 3.12a2 2 0 6.941L4 17l-4.17l-4.17 4.17l-4.17H18.41V17.659z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex justify-start pb-4">
            <div className="bg-brand-100 text-brand-800 rounded-lg px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-brand-300 border-t-brand-500 rounded-full"></div>
                <span className="text-brand-700">AI正在思考中...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部输入区域 */}
      <InputArea
        onSendMessage={handleSendMessage}
        loading={loading}
      />
    </div>
  );
}