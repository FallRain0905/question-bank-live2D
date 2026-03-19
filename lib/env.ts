/**
 * 环境变量类型安全封装
 */

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`环境变量 ${key} 未设置`);
  }
  return value;
}

export const ENV = {
  get SUPABASE_URL() {
    return getEnv('NEXT_PUBLIC_SUPABASE_URL');
  },
  get SUPABASE_ANON_KEY() {
    return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  get KIMI_API_URL() {
    return 'https://api.moonshot.cn/v1/chat/completions';
  },
  // 添加更多环境变量...
} as const;

export function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}
