/**
 * LLM配置管理服务
 * 管理AI助手的LLM模型配置和用户自定义设置
 */

// LLM配置接口
export interface LLMConfig {
  id: string;
  name: string;
  provider: 'qwen' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey?: string;
  apiUrl?: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  isDefault: boolean;
  capabilities?: string[]; // 模型能力标识：'vision', 'code', 'math' 等
}

// 预定义的LLM配置
export const PREDEFINED_LLMS: LLMConfig[] = [
  {
    id: 'qwen3-max',
    name: '千问 Qwen3 Max (最强)',
    provider: 'qwen',
    model: 'qwen3-max',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: true,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['text', 'code'],
  },
  {
    id: 'qwen3-6-plus',
    name: '千问 Qwen3.6 Plus (推荐)',
    provider: 'qwen',
    model: 'qwen3.6-plus',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['text', 'code'],
  },
  {
    id: 'qwen3-5-plus',
    name: '千问 Qwen3.5 Plus',
    provider: 'qwen',
    model: 'qwen3.5-plus',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['text', 'code'],
  },
  {
    id: 'qwen3-5-flash',
    name: '千问 Qwen3.5 Flash (快速)',
    provider: 'qwen',
    model: 'qwen3.5-flash',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['text'],
  },
  {
    id: 'qwen-vl-max',
    name: '千问 VL Max (视觉) - 推荐',
    provider: 'qwen',
    model: 'qwen-vl-max',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['vision', 'text', 'code'],
  },
  {
    id: 'qwen-vl-plus',
    name: '千问 VL Plus (视觉)',
    provider: 'qwen',
    model: 'qwen-vl-plus',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/responses',
    capabilities: ['vision', 'text'],
  },
  {
    id: 'gpt-4-vision',
    name: 'GPT-4 Vision',
    provider: 'openai',
    model: 'gpt-4-vision-preview',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    capabilities: ['vision', 'text', 'code'],
  },
  {
    id: 'claude-3-vision',
    name: 'Claude 3 Vision',
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    maxTokens: 2000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://api.anthropic.com/v1/messages',
    capabilities: ['vision', 'text', 'code'],
  },
];

// 用户AI配置接口
export interface UserAIProfile {
  id: string;
  userId: string;
  assistantName: string;
  assistantPersonality: string;
  assistantRole: string;
  selectedLLMId: string;
  customSystemPrompt?: string;
  responseStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  language: 'zh-CN' | 'en-US' | 'auto';
  customLLMs: LLMConfig[];
  apiKeys: Record<string, string>; // 存储不同提供商的API Key
  createdAt: string;
  updatedAt: string;
}

// 默认配置
export const DEFAULT_USER_AI_PROFILE: Omit<UserAIProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  assistantName: '学习助手',
  assistantPersonality: '友好、耐心、喜欢鼓励学生',
  assistantRole: '你是一个专业的学习助手，专门帮助学生理解和解决问题',
  selectedLLMId: 'qwen3-max',
  responseStyle: 'friendly',
  language: 'zh-CN',
  customLLMs: [],
  apiKeys: {},
};

// 从localStorage获取用户AI配置
export function getUserAIProfile(userId: string): UserAIProfile | null {
  try {
    const key = `user_ai_profile_${userId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('获取用户AI配置失败:', error);
    return null;
  }
}

// 保存用户AI配置到localStorage
export function saveUserAIProfile(userId: string, profile: UserAIProfile): boolean {
  try {
    const key = `user_ai_profile_${userId}`;
    localStorage.setItem(key, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('保存用户AI配置失败:', error);
    return false;
  }
}

// 创建或获取用户AI配置
export function getOrCreateUserAIProfile(userId: string): UserAIProfile {
  let profile = getUserAIProfile(userId);

  if (!profile) {
    profile = {
      id: `profile_${userId}`,
      userId,
      ...DEFAULT_USER_AI_PROFILE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveUserAIProfile(userId, profile);
  }

  return profile;
}

// 更新用户AI配置
export function updateUserAIProfile(userId: string, updates: Partial<UserAIProfile>): UserAIProfile | null {
  try {
    const profile = getOrCreateUserAIProfile(userId);
    const updatedProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveUserAIProfile(userId, updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('更新用户AI配置失败:', error);
    return null;
  }
}

// 获取可用的LLM配置
export function getAvailableLLMs(userId: string): LLMConfig[] {
  const profile = getUserAIProfile(userId);
  if (!profile) {
    return PREDEFINED_LLMS.filter(llm => llm.enabled);
  }

  // 合并预定义配置和自定义配置
  const customLLMs = profile.customLLMs || [];
  return [...PREDEFINED_LLMS, ...customLLMs].filter(llm => llm.enabled);
}

// 获取选中的LLM配置
export function getSelectedLLM(userId: string): LLMConfig | null {
  const profile = getUserAIProfile(userId);
  if (!profile) {
    return PREDEFINED_LLMS.find(llm => llm.isDefault) || null;
  }

  const allLLMs = getAvailableLLMs(userId);
  return allLLMs.find(llm => llm.id === profile.selectedLLMId) || null;
}

// 添加自定义LLM配置
export function addCustomLLM(userId: string, llm: Omit<LLMConfig, 'id' | 'enabled' | 'isDefault'>): UserAIProfile | null {
  try {
    const profile = getOrCreateUserAIProfile(userId);
    const newLLM: LLMConfig = {
      ...llm,
      id: `custom_${Date.now()}`,
      enabled: true,
      isDefault: false,
    };

    const updatedProfile = {
      ...profile,
      customLLMs: [...(profile.customLLMs || []), newLLM],
      updatedAt: new Date().toISOString(),
    };

    saveUserAIProfile(userId, updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('添加自定义LLM失败:', error);
    return null;
  }
}

// 删除自定义LLM配置
export function deleteCustomLLM(userId: string, llmId: string): UserAIProfile | null {
  try {
    const profile = getOrCreateUserAIProfile(userId);
    const customLLMs = (profile.customLLMs || []).filter(llm => llm.id !== llmId);

    const updatedProfile = {
      ...profile,
      customLLMs,
      // 如果删除的是当前选中的LLM，切换到默认的
      selectedLLMId: profile.selectedLLMId === llmId ? PREDEFINED_LLMS[0].id : profile.selectedLLMId,
      updatedAt: new Date().toISOString(),
    };

    saveUserAIProfile(userId, updatedProfile);
    return updatedProfile;
  } catch (error) {
    console.error('删除自定义LLM失败:', error);
    return null;
  }
}

// 生成系统提示词（使用新的模块化提示词系统）
export function generateSystemPrompt(userId: string, memoryContext?: string): string {
  const profile = getOrCreateUserAIProfile(userId);

  // 导入模块化提示词
  const { generateCompleteSystemPrompt } = require('./prompts/sys');
  const { generateCharacterFromUserConfig } = require('./prompts/chara');

  // 生成角色提示词
  const characterPrompt = generateCharacterFromUserConfig({
    assistantName: profile.assistantName,
    assistantPersonality: profile.assistantPersonality,
    responseStyle: profile.responseStyle,
    assistantRole: profile.assistantRole,
  });

  // 生成记忆上下文提示词
  let memoryPrompt = '';
  if (memoryContext) {
    memoryPrompt = memoryContext;
  } else if (profile.customSystemPrompt) {
    memoryPrompt = `**User Custom Requirements**: ${profile.customSystemPrompt}`;
  }

  // 语言设定
  if (profile.language !== 'auto') {
    const languageNames = {
      'zh-CN': '中文',
      'en-US': '英语',
    };
    memoryPrompt += `\n\n**Language Preference**: Respond in ${languageNames[profile.language]}`;
  }

  // 使用新的模块化系统生成完整提示词
  return generateCompleteSystemPrompt(characterPrompt, memoryPrompt);
}

// 获取LLM API配置（用于实际调用）
export function getLLMAPIConfig(userId: string): { apiKey?: string; apiUrl?: string; model: string; provider: string } | null {
  const llm = getSelectedLLM(userId);
  if (!llm) return null;

  const profile = getOrCreateUserAIProfile(userId);
  const config: any = {
    model: llm.model,
    provider: llm.provider,
  };

  // 如果是自定义LLM，使用LLM配置中的API Key和URL
  if (llm.provider === 'custom') {
    config.apiKey = llm.apiKey;
    if (llm.apiUrl) {
      config.apiUrl = llm.apiUrl;
    }
  } else {
    // 对于预定义模型，使用用户的API Key配置
    const userApiKey = profile.apiKeys?.[llm.provider];
    if (userApiKey && userApiKey.trim()) {
      config.apiKey = userApiKey;
    }

    // 使用LLM配置中的URL
    if (llm.apiUrl) {
      config.apiUrl = llm.apiUrl;
    }
  }

  return config;
}

// 检查模型是否支持图片识别
export function supportsVision(llm: LLMConfig | null): boolean {
  if (!llm) return false;
  return llm.capabilities?.includes('vision') || false;
}

// 获取第一个支持视觉的模型
export function getVisionModel(userId: string): LLMConfig | null {
  const availableLLMs = getAvailableLLMs(userId);
  return availableLLMs.find(llm => supportsVision(llm)) || null;
}

// 切换到支持视觉的模型
export function switchToVisionModel(userId: string): UserAIProfile | null {
  const visionModel = getVisionModel(userId);
  if (!visionModel) {
    return null;
  }

  return updateUserAIProfile(userId, {
    selectedLLMId: visionModel.id
  });
}
