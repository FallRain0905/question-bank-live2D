// AI 服务统一调用工具
// 支持：千问、Kimi、自定义模型（都需要用户填 API Key）

export interface AIConfig {
  provider: 'qwen' | 'kimi' | 'custom';
  apiKey: string;
  apiUrl?: string;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// API 端点配置
const API_ENDPOINTS = {
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
};

// 默认模型配置
const DEFAULT_MODELS = {
  qwen: 'qwen-plus',
  kimi: 'moonshot-v1-8k',
};

/**
 * 调用 AI 模型
 */
export async function callAI(
  config: AIConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content?: string; error?: string }> {
  const { provider, apiKey, apiUrl, model } = config;
  const { temperature = 0.7, maxTokens = 4096 } = options || {};

  // 验证 API Key
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, error: '请配置 API Key' };
  }

  try {
    let finalApiUrl: string;
    let finalModel: string;

    switch (provider) {
      case 'qwen':
        finalApiUrl = apiUrl || API_ENDPOINTS.qwen;
        finalModel = model || DEFAULT_MODELS.qwen;
        break;

      case 'kimi':
        finalApiUrl = apiUrl || API_ENDPOINTS.kimi;
        finalModel = model || DEFAULT_MODELS.kimi;
        break;

      case 'custom':
        if (!apiUrl) {
          return { success: false, error: '自定义模型需要提供 API URL' };
        }
        finalApiUrl = apiUrl;
        finalModel = model || 'gpt-3.5-turbo';
        break;

      default:
        return { success: false, error: '未知的 AI 提供商' };
    }

    console.log(`[AI] 调用 ${provider} API: ${finalApiUrl}`);
    console.log(`[AI] 模型: ${finalModel}`);

    const response = await fetch(finalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] API 错误:`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        return { 
          success: false, 
          error: errorData.error?.message || errorData.message || `API 调用失败: ${response.status}` 
        };
      } catch {
        return { success: false, error: `API 调用失败: ${response.status}` };
      }
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log(`[AI] 响应长度: ${content.length} 字符`);

    return { success: true, content };
  } catch (error: any) {
    console.error(`[AI] 调用失败:`, error);
    return { success: false, error: error.message || '未知错误' };
  }
}

/**
 * 获取默认配置（不再使用，保留兼容性）
 */
export function getDefaultConfig(): AIConfig {
  return {
    provider: 'qwen',
    apiKey: '', // 需要用户填写
  };
}
