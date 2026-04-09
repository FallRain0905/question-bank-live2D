'use client';

import { useState } from 'react';
import { getAvailableLLMs, getSelectedLLM, supportsVision, type LLMConfig } from '@/lib/llm-config-service';

interface UnifiedModelSelectorProps {
  userId: string;
  onModelChange?: (model: LLMConfig) => void;
  compact?: boolean; // 紧凑模式，用于工具栏
}

export default function UnifiedModelSelector({ userId, onModelChange, compact = false }: UnifiedModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableModels = getAvailableLLMs(userId);
  const selectedModel = getSelectedLLM(userId);

  const handleModelSelect = (model: LLMConfig) => {
    // 更新用户配置
    const { updateUserAIProfile } = require('@/lib/llm-config-service');
    updateUserAIProfile(userId, { selectedLLMId: model.id });

    setIsOpen(false);
    onModelChange?.(model);
  };

  const getProviderBadge = (model: LLMConfig) => {
    const providers: Record<string, { name: string; color: string }> = {
      qwen: { name: '千问', color: 'bg-blue-500' },
      openai: { name: 'OpenAI', color: 'bg-green-500' },
      anthropic: { name: 'Claude', color: 'bg-purple-500' },
      custom: { name: '自定义', color: 'bg-gray-500' },
    };

    const provider = providers[model.provider] || { name: model.provider, color: 'bg-gray-500' };
    return provider;
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-all text-sm"
        >
          <div className={`w-2 h-2 rounded-full ${getProviderBadge(selectedModel).color}`} />
          <span className="font-medium text-brand-700">{selectedModel?.name || '选择模型'}</span>
          <svg
            className={`w-4 h-4 text-brand-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-brand-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 bg-brand-50 border-b border-brand-200">
              <h3 className="text-sm font-semibold text-brand-800">选择AI模型</h3>
              <p className="text-xs text-brand-600 mt-1">不同模型适用于不同场景</p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {availableModels.map((model) => {
                const provider = getProviderBadge(model);
                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      selectedModel?.id === model.id ? 'bg-brand-100' : 'hover:bg-brand-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${provider.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {provider.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-brand-800">{model.name}</div>
                        {supportsVision(model) && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">👁️ 视觉</span>
                        )}
                        {model.capabilities?.includes('code') && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">💻 代码</span>
                        )}
                      </div>
                      <div className="text-xs text-brand-600 mt-0.5">{model.model}</div>
                    </div>
                    {selectedModel?.id === model.id && (
                      <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${getProviderBadge(selectedModel).color} flex items-center justify-center text-white font-bold`}>
            {getProviderBadge(selectedModel).name.charAt(0)}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-brand-800">{selectedModel?.name || '选择模型'}</div>
            <div className="text-xs text-brand-600">{selectedModel?.model || ''}</div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-brand-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-brand-200 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 bg-brand-50 border-b border-brand-200">
            <h3 className="text-sm font-semibold text-brand-800">选择AI模型</h3>
            <p className="text-xs text-brand-600 mt-1">不同模型适用于不同场景</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {availableModels.map((model) => {
              const provider = getProviderBadge(model);
              return (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                    selectedModel?.id === model.id ? 'bg-brand-100' : 'hover:bg-brand-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${provider.color} flex items-center justify-center text-white font-bold`}>
                    {provider.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-brand-800">{model.name}</div>
                    <div className="text-xs text-brand-600 mt-0.5">{model.model}</div>
                  </div>
                  {selectedModel?.id === model.id && (
                    <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
