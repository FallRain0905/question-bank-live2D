/**
 * 记忆服务
 * 管理学习记忆的三层架构：事实层、反思层、画像层
 */

import { getSupabase } from './supabase';

// 记忆类型
export type MemoryType = 'fact' | 'reflection' | 'persona';

// 事实层记忆
export interface FactMemory {
  id?: string;
  userId: string;
  content: string;
  importance: number; // 1-10
  entity: string[]; // 知识点标签
  category: string; // performance, goals, gaps, patterns, progress
  timestamp: string;
  createdAt?: string;
}

// 反思层记忆
export interface ReflectionMemory {
  id?: string;
  userId: string;
  content: string;
  confidence: number; // 0-1
  supportingFacts: string[]; // 支持的事实ID
  category: string; // performance, efficiency, behavioral, knowledge
  createdAt?: string;
}

// 画像层记忆
export interface PersonaMemory {
  userId: string;
  academicLevel: string;
  learningStyle: string;
  motivation: string;
  goals: string[];
  preferences: {
    teachingStyle: string;
    pacing: string;
    feedback: string;
  };
  updatedAt?: string;
  createdAt?: string;
}

/**
 * 保存事实层记忆
 */
export async function saveFactMemory(fact: FactMemory): Promise<FactMemory | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('Supabase not available, using localStorage fallback');
      return saveFactMemoryLocal(fact);
    }

    const { data, error } = await supabase
      .from('learning_facts')
      .insert({
        ...fact,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log('Supabase插入失败，使用本地存储:', error?.message || error);
      return saveFactMemoryLocal(fact);
    }
    return data;
  } catch (error: any) {
    console.log('保存事实记忆异常:', error?.message || error);
    return saveFactMemoryLocal(fact);
  }
}

/**
 * 本地存储事实层记忆
 */
function saveFactMemoryLocal(fact: FactMemory): FactMemory | null {
  try {
    const key = `learning_facts_${fact.userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(existing)) {
      console.warn('本地存储数据格式错误，重新初始化');
      localStorage.setItem(key, JSON.stringify([]));
      return null;
    }

    const newFact = { ...fact, id: `fact_${Date.now()}` };
    const updated = [...existing, newFact];
    localStorage.setItem(key, JSON.stringify(updated));
    return newFact;
  } catch (error: any) {
    console.log('本地保存事实记忆异常:', error?.message || error);
    return null;
  }
}

/**
 * 获取用户的事实层记忆
 */
export async function getFactMemories(userId: string, limit: number = 10): Promise<FactMemory[]> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('Supabase不可用，使用本地存储');
      return getFactMemoriesLocal(userId, limit);
    }

    const { data, error } = await supabase
      .from('learning_facts')
      .select('*')
      .eq('userId', userId)
      .order('importance', { ascending: false })
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('Supabase查询错误，使用本地存储:', error);
      return getFactMemoriesLocal(userId, limit);
    }

    return data || [];
  } catch (error: any) {
    console.log('获取事实记忆异常，使用本地存储:', error?.message || error);
    return getFactMemoriesLocal(userId, limit);
  }
}

/**
 * 本地获取事实层记忆
 */
function getFactMemoriesLocal(userId: string, limit: number = 10): FactMemory[] {
  try {
    const key = `learning_facts_${userId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(existing) ? existing.slice(0, limit) : [];
  } catch (error: any) {
    console.log('本地获取事实记忆异常:', error?.message || error);
    return [];
  }
}

/**
 * 从对话中提取事实
 */
export async function extractFactsFromConversation(
  userId: string,
  conversation: Array<{ role: string; content: string }>
): Promise<FactMemory[]> {
  try {
    // 这里应该调用AI API来提取事实
    // 暂时使用简单的规则提取
    const facts: FactMemory[] = [];

    // 示例：提取学习目标
    const goals = conversation.filter(msg =>
      msg.content.includes('目标') ||
      msg.content.includes('计划') ||
      msg.content.includes('考试') ||
      msg.content.includes('四级') ||
      msg.content.includes('六级') ||
      msg.content.includes('考研')
    );

    goals.forEach((goal, index) => {
      if (index < 3) { // 限制数量
        facts.push({
          userId,
          content: `用户提到：${goal.content}`,
          importance: 8,
          entity: extractEntities(goal.content),
          category: 'goals',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // 示例：提取学习进度
    const progress = conversation.filter(msg =>
      msg.content.includes('正确') ||
      msg.content.includes('错误') ||
      msg.content.includes('得分') ||
      msg.content.includes('正确率')
    );

    progress.slice(0, 2).forEach((prog, index) => {
      facts.push({
        userId,
        content: `用户学习情况：${prog.content}`,
        importance: 7,
        entity: extractEntities(prog.content),
        category: 'performance',
        timestamp: new Date().toISOString(),
      });
    });

    return facts;
  } catch (error: any) {
    console.log('提取事实异常:', error?.message || error);
    return [];
  }
}

/**
 * 提取实体（知识点）
 */
function extractEntities(text: string): string[] {
  const entities = [];
  const keywords = ['数学', '英语', '物理', '化学', '生物', '语文', '历史', '地理', '政治',
    '函数', '导数', '积分', '方程', '不等式', '概率', '统计',
    '词汇', '语法', '阅读', '听力', '写作',
    '力学', '电学', '光学', '原子', '分子'];

  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      entities.push(keyword);
    }
  });

  return entities.length > 0 ? entities : ['学习'];
}

/**
 * 生成记忆上下文
 */
export async function generateMemoryContext(userId: string): Promise<string> {
  try {
    const facts = await getFactMemories(userId, 5);

    if (facts.length === 0) {
      return '';
    }

    let context = '**Recent Learning Activity**:\n\n';

    // 按重要性排序
    facts.sort((a, b) => b.importance - a.importance);

    facts.forEach((fact, index) => {
      context += `${index + 1}. ${fact.content} (重要性: ${fact.importance}/10)\n`;
    });

    return context;
  } catch (error: any) {
    console.log('生成记忆上下文异常:', error?.message || error);
    return '';
  }
}

/**
 * 生成内心活动
 */
export function generateInnerThoughts(userName: string, recentFacts: FactMemory[]): string {
  if (recentFacts.length === 0) {
    return `[Inner Thoughts]: ${userName}，准备好开始今天的学习吧！`;
  }

  const importantFacts = recentFacts.filter(f => f.importance >= 7);
  if (importantFacts.length > 0) {
    const topFact = importantFacts[0];
    return `[Inner Thoughts]: ${userName}，我注意到你最近在专注于${topFact.entity.join('、')}相关的学习，让我为你整理一下相关的知识点和易错点...`;
  }

  return `[Inner Thoughts]: ${userName}，继续加油！你最近的进步很不错，我们继续攻克新的知识点吧！`;
}

/**
 * 对话结束时保存记忆
 */
export async function saveConversationMemories(
  userId: string,
  conversation: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    // 提取事实
    const facts = await extractFactsFromConversation(userId, conversation);

    // 保存重要的事实
    for (const fact of facts) {
      if (fact.importance >= 6) {
        await saveFactMemory(fact);
      }
    }

    console.log(`保存了 ${facts.length} 条学习记忆`);
  } catch (error) {
    console.error('保存对话记忆失败:', error);
  }
}
