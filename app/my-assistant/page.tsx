'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { saveLive2DSettings } from '@/lib/live2d-settings';

export default function MyAssistantPage() {
  const [configured, setConfigured] = useState(false);
  const [assistantName, setAssistantName] = useState('');
  const [assistantModel, setAssistantModel] = useState('neko');
  const [assistantAge, setAssistantAge] = useState('16');
  const [assistantPersonality, setAssistantPersonality] = useState('活泼可爱，喜欢撒娇，喜欢被夸奖，但有时也会偷懒');
  const [showConfigForm, setShowConfigForm] = useState(false);

  useEffect(() => {
    // 检查是否已配置
    const checkConfig = () => {
      const assistantConfig = localStorage.getItem('ai_assistant_config');
      if (assistantConfig) {
        const config = JSON.parse(assistantConfig);
        if (config.name && config.model) {
          setAssistantName(config.name);
          setAssistantModel(config.model);
          setAssistantAge(config.age || '16');
          setAssistantPersonality(config.personality || '活泼可爱，喜欢撒娇，喜欢被夸奖，但有时也会偷懒');
          setConfigured(true);
        }
      }
    };

    checkConfig();
  }, []);

  const handleFirstTimeSetup = () => {
    setShowConfigForm(true);
  };

  const handleConfigSave = () => {
    const config = {
      name: assistantName,
      model: assistantModel,
      age: assistantAge,
      personality: assistantPersonality,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('ai_assistant_config', JSON.stringify(config));
    setShowConfigForm(false);
    setConfigured(true);

    // 配置AI助手后，自动显示Live2D角色
    saveLive2DSettings({ visible: true });
  };

  const handleSkipConfig = () => {
    // 使用默认配置
    const defaultConfig = {
      name: '小甜心',
      model: 'neko',
      age: '16',
      personality: '活泼可爱，喜欢撒娇，喜欢被夸奖，但有时也会偷懒'
    };
    setAssistantName(defaultConfig.name);
    setAssistantModel(defaultConfig.model);
    setAssistantAge(defaultConfig.age);
    setAssistantPersonality(defaultConfig.personality);
    localStorage.setItem('ai_assistant_config', JSON.stringify(defaultConfig));
    setConfigured(true);
    setShowConfigForm(false);

    // 配置AI助手后，自动显示Live2D角色
    saveLive2DSettings({ visible: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-brand-100">
      {/* 顶部提示栏 */}
      <div className="bg-yellow-400 text-yellow-900 px-4 py-3 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-4xl font-bold mb-2">🎉 这是一个正在测试的beta版本！</div>
          <div className="text-lg mb-6">
            <p className="mb-2">欢迎各位试用 <strong className="font-bold">猫咪助手</strong>！</p>
            <p className="mb-4">作为你的专属AI学习伙伴，她会陪伴你一起学习，解答问题，分享知识。</p>
            <div className="bg-white/80 rounded-lg p-4 mb-6">
              <p className="font-medium mb-2">💡 功能特点：</p>
              <ul className="space-y-2 text-sm">
                <li>🤖 <strong>千问大模型</strong>：集成先进的语言模型，理解复杂问题</li>
                <li>🧠 <strong>独立对话记忆</strong>：记得你之前的所有对话，上下文连贯</li>
                <li>💭 <strong>多模态支持</strong>：文本、图片、语音等多种交互方式</li>
                <li>🎭 <strong>专属角色</strong>：可以根据你的喜好自定义猫咪助手的性格</li>
                <li>📝 <strong>智能提示</strong>：基于对话内容智能推荐相关学习资源</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {!configured ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-6xl mb-6">🐱</div>
            <h1 className="text-3xl font-bold text-brand-800 mb-4">
              {assistantName || '猫咪助手'}
            </h1>
            <p className="text-lg text-brand-600 mb-8">
              现在就配置属于你的专属AI助手吧！
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={handleFirstTimeSetup}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all text-lg font-medium shadow-lg"
              >
                🎮 开始配置
              </button>
              <Link
                href="/"
                className="px-8 py-4 bg-white text-brand-600 rounded-xl hover:bg-brand-100 border-2 border-brand-200 transition-all text-lg font-medium"
              >
                稍后再说
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-4xl">
            <div className="text-6xl mb-6">🐱</div>
            <div className="text-2xl font-bold text-brand-800 mb-2">
              {assistantName}
            </div>
            <p className="text-lg text-brand-600 mb-8">
              你的专属AI助手已准备就绪！
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-2xl">
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-brand-800 mb-4">💬 对话功能</h3>
                <p className="text-sm text-brand-600 mb-4">
                  记得你之前的所有对话，她会记住你说的每一句话。
                </p>
                <Link
                  href="/"
                  className="block w-full px-6 py-4 bg-white text-brand-600 rounded-xl hover:bg-brand-100 border-2 border-brand-200 transition-all text-lg font-medium"
                >
                  📝 开始对话
                </Link>
              </div>

              <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-brand-800 mb-4">🎭 角色配置</h3>
                <p className="text-sm text-brand-600 mb-4">
                  当前角色：{assistantName}
                </p>
                <button
                  onClick={() => setShowConfigForm(true)}
                  className="w-full px-6 py-4 bg-white text-brand-600 rounded-xl hover:bg-brand-100 border-2 border-brand-200 transition-all text-lg font-medium"
                >
                  ✏️ 修改配置
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-brand-800 mb-4">📚 功能说明</h3>
                <ul className="space-y-3 text-sm text-brand-600">
                  <li>• 千问大模型支持复杂问题理解和推理</li>
                  <li> 独立对话存储，每次回复都有完整上下文</li>
                  <li> 支持文本、图片、语音多种输入方式</li>
                  <li> 可自定义猫咪助手性格和特征</li>
                  <li> 智能推荐相关学习资源</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 配置表单 - 独立渲染在内容区域外 */}
      {showConfigForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <h2 className="text-2xl font-bold text-center text-brand-800 mb-6">
              配置你的专属猫咪助手 🐱
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  助手名字
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="给她取个可爱的名字"
                  className="w-full px-4 py-3 rounded-lg border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  模型选择
                </label>
                <select
                  value={assistantModel}
                  onChange={(e) => setAssistantModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                >
                  <option value="neko">🐱 neko（甜心小猫）</option>
                  <option value="witch">🧙 witch（优雅魔女）</option>
                  <option value="tia">👧 tia（可爱少女）</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  年龄
                </label>
                <input
                  type="number"
                  value={assistantAge}
                  onChange={(e) => setAssistantAge(e.target.value)}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 rounded-lg border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-4">
                  性格特征
                </label>
                <textarea
                  value={assistantPersonality}
                  onChange={(e) => setAssistantPersonality(e.target.value)}
                  placeholder="描述猫咪的性格..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-brand-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleConfigSave}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all text-lg font-medium shadow-lg"
                >
                  ✅ 保存配置
                </button>
                <button
                  onClick={handleSkipConfig}
                  className="flex-1 px-6 py-3 bg-white text-brand-600 rounded-xl hover:bg-brand-100 border-2 border-brand-200 transition-all text-lg font-medium"
                >
                  ⏭️ 使用默认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="bg-brand-900 py-8 text-center">
        <p className="text-sm text-brand-400">
          💡 提示：在AI助手页面配置后，即可在任意页面通过浮动按钮使用专属猫咪助手
        </p>
      </div>
    </div>
  );
}
