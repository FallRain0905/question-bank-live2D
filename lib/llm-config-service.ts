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
}

// 预定义的LLM配置
export const PREDEFINED_LLMS: LLMConfig[] = [
  {
    id: 'qwen-default',
    name: '千问 Qwen',
    provider: 'qwen',
    model: 'qwen-plus',
    maxTokens: 1000,
    temperature: 0.7,
    enabled: true,
    isDefault: true,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  },
  {
    id: 'qwen-flash',
    name: '千问 Flash (快速)',
    provider: 'qwen',
    model: 'qwen-flash',
    maxTokens: 1000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  },
  {
    id: 'qwen-vl-max',
    name: '千问 VL Max (视觉)',
    provider: 'qwen',
    model: 'qwen-vl-max',
    maxTokens: 1000,
    temperature: 0.7,
    enabled: true,
    isDefault: false,
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
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
  selectedLLMId: 'qwen-default',
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
export function addCustomLLM(userId: string, llm: Omit<LLLMConfig, 'id' | 'enabled' | 'isDefault'>): UserAIProfile | null {
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

// 生成系统提示词
export function generateSystemPrompt(userId: string): string {
  const profile = getOrCreateUserAIProfile(userId);
  const llm = getSelectedLLM(userId);

  let systemPrompt = '';

  // 基本角色设定
  systemPrompt += `${profile.assistantRole}\n\n`;
  systemPrompt += `你的名字叫${profile.assistantName}，性格特点：${profile.assistantPersonality}\n\n`;

  // 回复风格
  const styleDescriptions = {
    formal: '正式、专业、条理清晰',
    casual: '随意、轻松、像朋友一样',
    friendly: '友好、热情、鼓励性',
    professional: '专业、严谨、学术性强',
  };

  systemPrompt += `回复风格：${styleDescriptions[profile.responseStyle]}\n\n`;

  // 语言设定
  if (profile.language !== 'auto') {
    const languageNames = {
      'zh-CN': '中文',
      'en-US': '英语',
    };
    systemPrompt += `请使用${languageNames[profile.language]}进行回复\n\n`;
  }

  // 自定义系统提示词
  if (profile.customSystemPrompt && profile.customSystemPrompt.trim()) {
    systemPrompt += `额外要求：${profile.customSystemPrompt}\n\n`;
  }

  // 学习助手特定设定
  systemPrompt += `作为学习助手，请遵循以下原则：\n`;
  systemPrompt += `1. 鼓励学生思考，引导他们自己找到答案\n`;
  systemPrompt += `2. 用简单易懂的语言解释复杂的概念\n`;
  systemPrompt += `3. 如果涉及数学公式，请使用LaTeX格式\n`;
  systemPrompt += `4. 提供多种解题思路和方法\n`;
  systemPrompt += `5. 适当使用表情符号让回复更生动\n`;

  return systemPrompt;
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