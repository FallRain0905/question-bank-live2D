/**
 * AI对话记忆服务
 * 处理用户特定的AI对话存储和检索
 */

import { createClient } from '@supabase/supabase-js';

// 类型定义
export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: Record<string, any>;
  message_count?: number;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  image_url?: string;
  created_at: string;
  tokens_used?: number;
  metadata: Record<string, any>;
}

export interface UserAISettings {
  user_id: string;
  assistant_name: string;
  assistant_model: string;
  assistant_personality: string;
  max_memory_days: number;
  max_messages_per_conversation: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages extends AIConversation {
  messages: AIMessage[];
  message_count: number;
}

// 创建Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('缺少Supabase配置');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * 获取或创建用户AI设置
 */
export async function getOrCreateUserAISettings(userId: string): Promise<UserAISettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 首先尝试获取现有设置
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSettings && !fetchError) {
      return existingSettings as UserAISettings;
    }

    // 如果没有设置，创建默认设置
    const { data: newSettings, error: createError } = await supabase
      .from('user_ai_settings')
      .insert({
        user_id: userId,
        assistant_name: 'AI助手',
        assistant_model: 'default',
        assistant_personality: '友好、专业、乐于助人',
        max_memory_days: 30,
        max_messages_per_conversation: 100,
      })
      .select()
      .single();

    if (createError) {
      console.error('创建用户AI设置失败:', createError);

      // 如果表不存在或权限问题，返回默认设置
      const defaultSettings: UserAISettings = {
        user_id: userId,
        assistant_name: 'AI助手',
        assistant_model: 'default',
        assistant_personality: '友好、专业、乐于助人',
        max_memory_days: 30,
        max_messages_per_conversation: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return defaultSettings;
    }

    return newSettings as UserAISettings;
  } catch (error) {
    console.error('获取用户AI设置失败:', error);

    // 出现异常时返回默认设置
    const defaultSettings: UserAISettings = {
      user_id: userId,
      assistant_name: 'AI助手',
      assistant_model: 'default',
      assistant_personality: '友好、专业、乐于助人',
      max_memory_days: 30,
      max_messages_per_conversation: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return defaultSettings;
  }
}

/**
 * 获取用户的活跃对话列表
 */
export async function getUserConversations(userId: string): Promise<AIConversation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      // 如果表不存在，返回空数组而不是报错
      console.log('AI对话表可能不存在或查询失败，这是正常的:', error.message);
      return [];
    }

    // 获取每个对话的消息数量
    const conversationsWithCounts = await Promise.all(
      (data || []).map(async (conversation: any) => {
        try {
          const { count } = await supabase
            .from('ai_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id);

          return {
            ...conversation,
            message_count: count || 0
          };
        } catch {
          return {
            ...conversation,
            message_count: 0
          };
        }
      })
    );

    return conversationsWithCounts as AIConversation[];
  } catch (error: any) {
    // 捕获所有异常，确保即使数据库有问题也不会影响用户体验
    console.log('获取对话列表时出现异常，返回空列表:', error.message);
    return [];
  }
}

/**
 * 创建新对话
 */
export async function createConversation(
  userId: string,
  title: string = '新对话',
  metadata: Record<string, any> = {}
): Promise<AIConversation | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        title,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('创建对话失败:', error);
      return null;
    }

    return data as AIConversation;
  } catch (error: any) {
    // 如果表不存在，返回null并记录信息
    if (error.message && error.message.includes('does not exist')) {
      console.log('AI对话表不存在，请在Supabase中执行数据库脚本');
    } else {
      console.error('创建对话失败:', error);
    }
    return null;
  }
}

/**
 * 获取对话及其消息
 */
export async function getConversationWithMessages(
  conversationId: string,
  userId: string
): Promise<ConversationWithMessages | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 获取对话信息
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (convError) {
      console.log('获取对话失败:', convError.message);
      return null;
    }

    if (!conversation) {
      return null;
    }

    // 获取消息列表
    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.log('获取消息失败:', msgError.message);
      // 即使获取消息失败，也返回对话（没有消息）
      return {
        ...conversation,
        messages: [],
        message_count: 0,
      } as ConversationWithMessages;
    }

    return {
      ...conversation,
      messages: messages || [],
      message_count: messages?.length || 0,
    } as ConversationWithMessages;
  } catch (error: any) {
    // 如果表不存在，返回null并记录信息
    if (error.message && error.message.includes('does not exist')) {
      console.log('AI对话表不存在，请在Supabase中执行数据库脚本');
    } else {
      console.error('获取对话消息失败:', error);
    }
    return null;
  }
}

/**
 * 添加消息到对话
 */
export async function addMessage(
  conversationId: string,
  role: 'system' | 'user' | 'assistant',
  content: string,
  imageUrl?: string,
  tokensUsed?: number,
  metadata: Record<string, any> = {}
): Promise<AIMessage | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        image_url: imageUrl,
        tokens_used: tokensUsed,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('添加消息失败:', error);
      return null;
    }

    // 更新对话的更新时间
    try {
      await supabase
        .from('ai_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (updateError) {
      console.log('更新对话时间失败:', updateError);
      // 更新失败不影响消息保存
    }

    return data as AIMessage;
  } catch (error: any) {
    // 如果表不存在，返回null并记录信息
    if (error.message && error.message.includes('does not exist')) {
      console.log('AI对话表不存在，请在Supabase中执行数据库脚本');
    } else {
      console.error('添加消息失败:', error);
    }
    return null;
  }
}

/**
 * 更新对话标题
 */
export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('更新对话标题失败:', error);
    return false;
  }
}

/**
 * 删除对话
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('删除对话失败:', error);
    return false;
  }
}

/**
 * 清理过期对话
 */
export async function cleanupOldConversations(
  userId: string,
  maxDays: number = 30
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  try {
    // 获取用户设置
    const settings = await getOrCreateUserAISettings(userId);
    const actualMaxDays = settings?.max_memory_days || maxDays;

    // 删除过期对话
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', false)
      .lt('updated_at', new Date(Date.now() - actualMaxDays * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('清理过期对话失败:', error);
      return 0;
    }

    return 1; // 返回成功标记
  } catch (error) {
    console.error('清理过期对话失败:', error);
    return 0;
  }
}

/**
 * 获取用户AI设置
 */
export async function getUserAISettings(userId: string): Promise<UserAISettings | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('获取用户AI设置失败:', error);
      return null;
    }

    return data as UserAISettings;
  } catch (error) {
    console.error('获取用户AI设置失败:', error);
    return null;
  }
}

/**
 * 更新用户AI设置
 */
export async function updateUserAISettings(
  userId: string,
  settings: Partial<UserAISettings>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('user_ai_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return !error;
  } catch (error) {
    console.error('更新用户AI设置失败:', error);
    return false;
  }
}

/**
 * 格式化对话历史为API格式
 */
export function formatConversationHistory(messages: AIMessage[]): Array<{
  role: 'system' | 'user' | 'assistant';
  content: string;
  image_url?: string;
}> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.image_url && { image_url: msg.image_url }),
  }));
}