'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase';

export interface Tag {
  id: number;
  name: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadTags();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('id, name')
        .order('name');

      if (fetchError) throw fetchError;

      if (isMounted.current) {
        setTags(data || []);
      }
    } catch (err) {
      console.error('获取标签失败:', err);
      if (isMounted.current) {
        setError('获取标签失败');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const tagNames = tags.map(t => t.name);

  return {
    tags,
    tagNames,
    loading,
    error,
    reload: loadTags,
  };
}

/**
 * 确保标签存在（如果不存在则创建）
 */
export async function ensureTagExists(tagName: string): Promise<number | null> {
  const supabase = getSupabase();

  // 先尝试获取
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('name', tagName)
    .single();

  if (existing) {
    return existing.id;
  }

  // 不存在则创建
  const { data, error } = await supabase
    .from('tags')
    .insert({ name: tagName })
    .select('id')
    .single();

  if (error) {
    console.error('创建标签失败:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * 关联标签到题目
 */
export async function attachTagsToQuestion(
  questionId: string,
  tagNames: string[]
): Promise<void> {
  for (const tagName of tagNames) {
    const tagId = await ensureTagExists(tagName);
    if (tagId) {
      const supabase = getSupabase();
      await supabase
        .from('question_tags')
        .insert({ question_id: questionId, tag_id: tagId });
    }
  }
}
