'use client';

import { useState, useEffect } from 'react';
import {
  getOrCreateUserAIProfile,
  updateUserAIProfile,
  getAvailableLLMs,
  addCustomLLM,
  deleteCustomLLM,
  generateSystemPrompt,
  supportsVision,
  type UserAIProfile,
  type LLMConfig,
} from '@/lib/llm-config-service';

interface AISettingsPanelProps {
  userId: string;
  userAIProfile: UserAIProfile | null;
  onClose: () => void;
  onUpdate?: (profile: UserAIProfile) => void;
}

export default function AISettingsPanel({ userId, onClose, onUpdate }: AISettingsPanelProps) {
  const [profile, setProfile] = useState<UserAIProfile | null>(null);
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
      const userProfile = getOrCreateUserAIProfile(userId);
      setProfile(userProfile);
    }
  }, [userId]);

  const handleSave = () => {
    if (profile) {
      const updatedProfile = updateUserAIProfile(userId, profile);
      if (updatedProfile) {
        setAvailableLLMs(getAvailableLLMs(userId));
        onUpdate?.(updatedProfile);
        onClose();
        alert('AI配置保存成功！');
      } else {
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

  const getCurrentSystemPrompt = () => {
    if (profile) {
      return generateSystemPrompt(userId);
    }
    return '';
  };

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-800">AI工作台设置</h2>
          <button onClick={onClose} className="text-brand-600 hover:text-brand-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 基本信息 */}
          <div>
            <h3 className="text-lg font-semibold text-brand-800 mb-4">助手配置</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-brand-700 mb-1">当前系统提示词</label>
                <button
                  onClick={() => {
                    const prompt = getCurrentSystemPrompt();
                    alert(`当前系统提示词（前200字符）：\n\n${prompt.substring(0, 200)}...`);
                  }}
                  className="w-full px-4 py-2 bg-brand-100 text-brand-700 rounded-lg hover:bg-brand-200 transition-colors text-sm"
                >
                  查看系统提示词
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-brand-700 mb-1">角色定位</label>
              <textarea
                value={profile.assistantRole}
                onChange={(e) => setProfile({ ...profile, assistantRole: e.target.value })}
                className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                rows={2}
                placeholder="AI助手的角色和定位，如：你是一个专业的学习助手，专门帮助学生理解和解决问题"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-brand-700 mb-1">性格特点</label>
              <textarea
                value={profile.assistantPersonality}
                onChange={(e) => setProfile({ ...profile, assistantPersonality: e.target.value })}
                className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none resize-none"
                rows={2}
                placeholder="描述AI助手的性格，如：友好、耐心、喜欢鼓励学生"
              />
            </div>

            <div className="mt-4">
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
                          {supportsVision(llm) && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">👁️ 视觉</span>
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
