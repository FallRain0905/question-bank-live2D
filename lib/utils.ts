// 工具函数

/**
 * 上传图片到 Supabase Storage
 */
export async function uploadImage(
  file: File,
  userId: string
): Promise<string | null> {
  const supabase = await import('./supabase').then(m => m.getSupabase());

  // 生成唯一文件名
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // 上传文件
  const { error } = await supabase.storage
    .from('question-images')
    .upload(filePath, file);

  if (error) {
    console.error('上传图片失败:', error);
    return null;
  }

  // 获取公开 URL
  const { data: { publicUrl } } = supabase.storage
    .from('question-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * 获取所有标签
 */
export async function getAllTags(): Promise<string[]> {
  const supabase = await import('./supabase').then(m => m.getSupabase());

  const { data, error } = await supabase
    .from('tags')
    .select('name')
    .order('name');

  if (error) {
    console.error('获取标签失败:', error);
    return [];
  }

  return data?.map(t => t.name) || [];
}

/**
 * 确保标签存在（如果不存在则创建）
 */
export async function ensureTagExists(tagName: string): Promise<number | null> {
  const supabase = await import('./supabase').then(m => m.getSupabase());

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
      const supabase = await import('./supabase').then(m => m.getSupabase());
      await supabase
        .from('question_tags')
        .insert({ question_id: questionId, tag_id: tagId });
    }
  }
}
