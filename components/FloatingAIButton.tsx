'use client';

import { useState } from 'react';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    setAnswer('');
    
    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      
      const data = await response.json();
      setAnswer(data.answer || '抱歉，我暂时无法回答这个问题。');
    } catch (error) {
      setAnswer('网络错误，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        title="AI 助手"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        
        {/* 脉冲动画 */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-30" />
        )}
      </button>

      {/* 对话框 */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-brand-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* 标题栏 */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 学习助手
            </h3>
          </div>
          
          {/* 内容区 */}
          <div className="p-4 max-h-80 overflow-y-auto">
            {answer ? (
              <div className="space-y-3">
                <div className="p-3 bg-brand-50 rounded-lg text-brand-700 text-sm leading-relaxed">
                  {answer}
                </div>
                <button
                  onClick={() => { setAnswer(''); setQuestion(''); }}
                  className="text-sm text-brand-500 hover:text-brand-600"
                >
                  再问一个问题
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-brand-600 mb-2">
                  有什么不懂的？问我试试～
                </p>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="输入你的问题..."
                  className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAsk}
                  disabled={loading || !question.trim()}
                  className="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '思考中...' : '提问'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
