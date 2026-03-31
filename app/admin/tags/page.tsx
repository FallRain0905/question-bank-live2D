'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';

interface Tag {
  id: number;
  name: string;
  created_at: string;
  questions_count?: number;
  notes_count?: number;
  total_count?: number;
}

type SortOption = 'name' | 'count';

export default function TagsAdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('count');
  const [searchText, setSearchText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadTags();
    }
  }, [isAdmin, sortBy, searchText]);

  const checkAuth = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const isAdmin = user.user_metadata?.is_admin === true ||
                      user.email === '3283254551@qq.com';

    if (!isAdmin) {
      alert('只有管理员才能访问此页面');
      router.push('/');
      return;
    }

    setIsAdmin(true);
  };

  const loadTags = async () => {
    const supabase = getSupabase();

    // 获取标签及其使用次数
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (!tagsData) {
      setTags([]);
      setLoading(false);
      return;
    }

    // 统计每个标签的使用次数
    const tagsWithCounts = await Promise.all(
      tagsData.map(async (tag) => {
        // 统计题目中使用次数
        const { count: questionsCount } = await supabase
          .from('question_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        // 统计笔记中使用次数
        const { data: noteTagsData } = await supabase
          .from('note_tags')
          .select('note_id')
          .eq('tag_id', tag.id);

        return {
          ...tag,
          questions_count: questionsCount || 0,
          notes_count: noteTagsData?.length || 0,
          total_count: (questionsCount || 0) + (noteTagsData?.length || 0),
        };
      })
    );

    // 排序
    let sortedTags = tagsWithCounts;
    if (sortBy === 'count') {
      sortedTags.sort((a, b) => (b.total_count || 0) - (a.total_count || 0));
    } else {
      sortedTags.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }

    // 搜索过滤
    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      sortedTags = sortedTags.filter(t =>
        t.name.toLowerCase().includes(lowerSearch)
      );
    }

    setTags(sortedTags);
    setLoading(false);
  };

  const handleEdit = async (tagId: number, newName: string) => {
    if (!newName.trim()) {
      alert('标签名称不能为空');
      return;
    }

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('请先登录');
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      }
    );

    const { error } = await authSupabase
      .from('tags')
      .update({ name: newName.trim() })
      .eq('id', tagId);

    if (error) {
      alert('更新失败: ' + error.message);
    } else {
      setEditingId(null);
      setEditName('');
      await loadTags();
    }
  };

  const handleDelete = async (tagId: number) => {
    if (!confirm('确定要删除这个标签吗？使用该标签的内容将不再关联此标签。')) return;

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('请先登录');
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      }
    );

    // 删除标签关联（会自动级联删除）
    const { error } = await authSupabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      await loadTags();
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      alert('请选择要合并的标签');
      return;
    }

    if (mergeSourceId === mergeTargetId) {
      alert('不能将标签合并到自己');
      return;
    }

    const sourceTag = tags.find(t => t.id === mergeSourceId);
    const targetTag = tags.find(t => t.id === mergeTargetId);

    if (!confirm(`确定将 "${sourceTag?.name}" 合并到 "${targetTag?.name}" 吗？\n\n"${sourceTag?.name}" 将被删除，其关联的内容将转移到 "${targetTag?.name}"。`)) {
      return;
    }

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('请先登录');
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      }
    );

    try {
      // 获取所有使用源标签的题目ID
      const { data: questionTags } = await authSupabase
        .from('question_tags')
        .select('question_id')
        .eq('tag_id', mergeSourceId);

      // 为这些题目添加目标标签
      if (questionTags && questionTags.length > 0) {
        const newQuestionTags = questionTags.map(qt => ({
          question_id: qt.question_id,
          tag_id: mergeTargetId,
        }));

        // 删除旧的关联
        await authSupabase
          .from('question_tags')
          .delete()
          .eq('tag_id', mergeSourceId);

        // 添加新关联（忽略冲突，因为可能已经存在）
        await authSupabase
          .from('question_tags')
          .insert(newQuestionTags);
      }

      // 获取所有使用源标签的笔记ID
      const { data: noteTags } = await authSupabase
        .from('note_tags')
        .select('note_id')
        .eq('tag_id', mergeSourceId);

      // 为这些笔记添加目标标签
      if (noteTags && noteTags.length > 0) {
        const newNoteTags = noteTags.map(nt => ({
          note_id: nt.note_id,
          tag_id: mergeTargetId,
        }));

        // 删除旧的关联
        await authSupabase
          .from('note_tags')
          .delete()
          .eq('tag_id', mergeSourceId);

        // 添加新关联
        await authSupabase
          .from('note_tags')
          .insert(newNoteTags);
      }

      // 删除源标签
      await authSupabase
        .from('tags')
        .delete()
        .eq('id', mergeSourceId);

      setShowMergeModal(false);
      setMergeSourceId(null);
      setMergeTargetId(null);
      await loadTags();
      alert('合并成功！');
    } catch (err: any) {
      console.error('合并失败:', err);
      alert('合并失败: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 页头 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">标签管理</h1>
              <p className="text-gray-500 text-sm mt-1">
                共 {tags.length} 个标签
              </p>
            </div>
            {/* 系统配置按钮 */}
            <Link
              href="/admin/settings"
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center gap-1"
            >
              ⚙️ 系统配置
            </Link>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-500"
            >
              返回审核
            </Link>
            <button
              onClick={loadTags}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              刷新
            </button>
          </div>
        </div>

        {/* 搜索和排序 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索标签..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="count">使用次数</option>
                <option value="name">名称</option>
              </select>
            </div>
          </div>
        </div>

        {/* 标签列表 */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchText ? '没有找到匹配的标签' : '还没有标签'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition"
              >
                {editingId === tag.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue={tag.name}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEdit(tag.id, editName || tag.name);
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEdit(tag.id, editName || tag.name)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditName('');
                      }}
                      className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 flex-1 break-all">
                        {tag.name}
                      </h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingId(tag.id);
                            setEditName(tag.name);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => {
                            setMergeSourceId(tag.id);
                            setShowMergeModal(true);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="合并"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => handleDelete(tag.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span>题目: {tag.questions_count || 0}</span>
                      <span className="mx-2">·</span>
                      <span>笔记: {tag.notes_count || 0}</span>
                      <span className="mx-2">·</span>
                      <span>总计: {tag.total_count || 0}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 合并弹窗 */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">合并标签</h2>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    要合并的标签（将被删除）
                  </label>
                  <select
                    value={mergeSourceId || ''}
                    onChange={(e) => setMergeSourceId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">选择标签...</option>
                    {tags.filter(t => t.id !== mergeTargetId).map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name} ({tag.total_count || 0} 使用)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    合并到目标标签（保留）
                  </label>
                  <select
                    value={mergeTargetId || ''}
                    onChange={(e) => setMergeTargetId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">选择标签...</option>
                    {tags.filter(t => t.id !== mergeSourceId).map(tag => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name} ({tag.total_count || 0} 使用)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeSourceId(null);
                    setMergeTargetId(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleMerge}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  确认合并
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 添加合并按钮（当没有打开弹窗时） */}
        {!showMergeModal && tags.length > 1 && (
          <button
            onClick={() => setShowMergeModal(true)}
            className="fixed bottom-8 right-8 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            🔄 合并标签
          </button>
        )}
      </div>
    </div>
  );
}
