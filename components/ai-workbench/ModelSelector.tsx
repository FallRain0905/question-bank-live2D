'use client';

import { useState } from 'react';
import { getAvailableLLMs, getSelectedLLM, saveSelectedLLM, type LLMModel } from '@/lib/llm-config-service';

interface ModelSelectorProps {
  userId: string;
  onModelChange?: (model: LLMModel) => void;
}

export default function ModelSelector({ userId, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableModels = getAvailableLLMs(userId);
  const selectedModel = getSelectedLLM(userId);

  const handleModelSelect = (model: LLMModel) => {
    saveSelectedLLM(userId, model);
    setIsOpen(false);
    onModelChange?.(model);
  };

  const getProviderBadge = (model: LLMModel) => {
    const providers: Record<string, { name: string; color: string }> = {
      qwen: { name: '千问', color: 'bg-blue-500' },
      openai: { name: 'OpenAI', color: 'bg-green-500' },
      anthropic: { name: 'Claude', color: 'bg-purple-500' },
      gemini: { name: 'Gemini', color: 'bg-orange-500' },
    };

    const provider = providers[model.provider] || { name: model.provider, color: 'bg-gray-500' };
    return provider;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 transition-all text-sm"
      >
        <div className={`w-2 h-2 rounded-full ${getProviderBadge(selectedModel).color}`} />
        <span className="font-medium text-brand-700">{selectedModel.name}</span>
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
                    selectedModel.id === model.id ? 'bg-brand-100' : 'hover:bg-brand-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${provider.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {provider.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-brand-800">{model.name}</div>
                    <div className="text-xs text-brand-600 mt-0.5">{model.description}</div>
                  </div>
                  {selectedModel.id === model.id && (
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
