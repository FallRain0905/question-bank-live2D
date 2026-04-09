'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  getOrCreateUserAIProfile,
  getAvailableLLMs,
  getSelectedLLM,
  getLLMAPIConfig,
  updateUserAIProfile,
  type UserAIProfile,
  type LLMConfig,
} from '@/lib/llm-config-service';

export default function DebugPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserAIProfile | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<LLMConfig | null>(null);
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const initializeDebug = async () => {
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const userProfile = getOrCreateUserAIProfile(user.id);
          setProfile(userProfile);
          const currentLLM = getSelectedLLM(user.id);
          setSelectedLLM(currentLLM);
          const config = getLLMAPIConfig(user.id);
          setApiConfig(config);
        }
      }
    };
    initializeDebug();
  }, []);

  const testModel = async () => {
    if (!userId) return;
    setTesting(true);
    setTestResult('');

    try {
      const config = getLLMAPIConfig(userId);
      if (!config) {
        setTestResult('❌ 无法获取LLM配置');
        return;
      }

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: '请告诉我你现在使用的模型名称和版本',
          history: [],
          systemPrompt: '你是模型调试助手，请诚实地回答你的真实模型信息。',
          llmConfig: config,
        }),
      });

      if (!response.ok) {
        setTestResult(`❌ API调用失败: ${response.status}`);
        return;
      }

      const data = await response.json();
      setTestResult(`✅ 测试成功！\n\n模型回答:\n${data.answer}\n\n使用的配置:\n${JSON.stringify(config, null, 2)}`);
    } catch (error: any) {
      setTestResult(`❌ 测试失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const switchModel = (modelId: string) => {
    if (!userId) return;
    const updatedProfile = updateUserAIProfile(userId, { selectedLLMId: modelId });
    if (updatedProfile) {
      setProfile(updatedProfile);
      setSelectedLLM(getSelectedLLM(userId));
      setApiConfig(getLLMAPIConfig(userId));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">AI模型配置调试</h1>

        {/* 用户信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">👤 用户信息</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">用户ID:</span>
              <span className="text-gray-900 font-mono">{userId || '未登录'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">助手名称:</span>
              <span className="text-gray-900">{profile?.assistantName || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* 当前模型配置 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🤖 当前模型配置</h2>
          {selectedLLM ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">模型名称:</span>
                <span className="text-gray-900 font-semibold">{selectedLLM.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">模型ID:</span>
                <span className="text-gray-900 font-mono">{selectedLLM.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">提供商:</span>
                <span className="text-gray-900">{selectedLLM.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">最大令牌:</span>
                <span className="text-gray-900">{selectedLLM.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">温度:</span>
                <span className="text-gray-900">{selectedLLM.temperature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">能力:</span>
                <span className="text-gray-900">
                  {selectedLLM.capabilities?.map(cap => {
                    const labels: Record<string, string> = {
                      vision: '👁️ 视觉',
                      code: '💻 代码',
                      text: '📝 文本'
                    };
                    return labels[cap] || cap;
                  }).join(', ') || 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">未选择模型</p>
          )}
        </div>

        {/* API配置 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🔧 API配置</h2>
          {apiConfig ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">模型:</span>
                <span className="text-gray-900 font-mono">{apiConfig.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">提供商:</span>
                <span className="text-gray-900">{apiConfig.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API URL:</span>
                <span className="text-gray-900 font-mono text-sm truncate max-w-md">{apiConfig.apiUrl}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Key:</span>
                <span className="text-gray-900">
                  {apiConfig.apiKey ? '✅ 已配置' : '❌ 未配置'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">无法获取API配置</p>
          )}
        </div>

        {/* 可用模型 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📋 可用模型</h2>
          <div className="space-y-2">
            {getAvailableLLMs(userId || '').map(llm => (
              <div
                key={llm.id}
                className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                  selectedLLM?.id === llm.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => switchModel(llm.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{llm.name}</div>
                    <div className="text-sm text-gray-600">{llm.model}</div>
                  </div>
                  <div className="flex gap-2">
                    {llm.capabilities?.includes('vision') && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">👁️ 视觉</span>
                    )}
                    {llm.capabilities?.includes('code') && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">💻 代码</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🧪 模型测试</h2>
          <button
            onClick={testModel}
            disabled={testing || !userId}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {testing ? '测试中...' : '测试当前模型'}
          </button>
          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </div>

        {/* 存储配置 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">💾 localStorage配置</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">selectedLLMId:</span>
              <span className="text-gray-900 font-mono">{profile?.selectedLLMId || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Keys:</span>
              <span className="text-gray-900">
                {Object.keys(profile?.apiKeys || {}).map(key => (
                  <span key={key} className="mr-2 bg-gray-100 px-2 py-1 rounded text-xs">
                    {key}: {profile?.apiKeys?.[key] ? '✅' : '❌'}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
