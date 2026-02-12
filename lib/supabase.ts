import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 浏览器端客户端
export function createSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 服务端客户端（用于 API Routes）
export function createSupabaseServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 单例模式（用于客户端组件）
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;
let isCacheCleared = false;

// 清除缓存的函数
export function clearSupabaseCache() {
  supabaseInstance = null;
  isCacheCleared = true;
  // 重置标志，延迟到下次初始化后
  setTimeout(() => {
    isCacheCleared = false;
  }, 100);
}

export function getSupabase() {
  // SSR 环境检查：服务端使用普通客户端
  if (typeof window === 'undefined') {
    return createSupabaseServerClient();
  }

  // 如果缓存刚被清除，强制重新创建
  if (!supabaseInstance || isCacheCleared) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('Supabase 环境变量未设置');
      throw new Error('Supabase 配置缺失');
    }

    supabaseInstance = createSupabaseClient();
    isCacheCleared = false;
  }
  return supabaseInstance;
}

// 用户信息缓存
const userProfileCache = new Map<string, UserProfile>();

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  email?: string;
}

/**
 * 获取用户显示名称 - 优先从 user_profiles 表获取，回退到 user_metadata
 */
export async function getUserDisplayName(userId: string, currentUser?: any): Promise<string> {
  // 先从缓存获取
  if (userProfileCache.has(userId)) {
    const profile = userProfileCache.get(userId)!;
    return profile.username || profile.display_name || '用户';
  }

  try {
    const supabase = getSupabase();

    // 从 user_profiles 表获取
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, display_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      // 缓存结果
      userProfileCache.set(userId, {
        id: userId,
        username: profile.username || '',
        display_name: profile.display_name || '',
      });
      return profile.username || profile.display_name || '用户';
    }
  } catch (err) {
    console.error('获取用户信息失败:', err);
  }

  // 回退：如果当前用户就是被查询的用户，从 user_metadata 获取
  if (currentUser?.id === userId) {
    const name = currentUser.user_metadata?.username || currentUser.user_metadata?.display_name;
    if (name) {
      // 同时创建 user_profiles 记录
      try {
        const supabase = getSupabase();
        await supabase.from('user_profiles').insert({
          id: userId,
          username: name,
          display_name: name,
        });
        userProfileCache.set(userId, { id: userId, username: name, display_name: name });
      } catch (e) {
        // 忽略插入错误
      }
      return name;
    }
  }

  return '用户';
}

/**
 * 批量获取用户信息 - 用于评论列表等场景
 */
export async function getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  const result = new Map<string, UserProfile>();

  // 过滤掉已缓存的用户
  const uncachedIds = userIds.filter(id => !userProfileCache.has(id));

  if (uncachedIds.length === 0) {
    // 全部命中缓存
    userIds.forEach(id => {
      const profile = userProfileCache.get(id);
      if (profile) result.set(id, profile);
    });
    return result;
  }

  try {
    const supabase = getSupabase();
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', uncachedIds);

    if (profiles) {
      profiles.forEach(profile => {
        const userProfile: UserProfile = {
          id: profile.id,
          username: profile.username || '',
          display_name: profile.display_name || '',
          avatar_url: profile.avatar_url,
        };
        userProfileCache.set(profile.id, userProfile);
        result.set(profile.id, userProfile);
      });
    }
  } catch (err) {
    console.error('批量获取用户信息失败:', err);
  }

  // 为未找到的用户创建默认条目
  userIds.forEach(id => {
    if (!result.has(id)) {
      result.set(id, {
        id,
        username: '',
        display_name: '用户',
      });
    }
  });

  return result;
}

/**
 * 清除用户信息缓存
 */
export function clearUserProfileCache(userId?: string) {
  if (userId) {
    userProfileCache.delete(userId);
  } else {
    userProfileCache.clear();
  }
}
