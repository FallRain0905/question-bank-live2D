'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getAllTags } from '@/lib/utils';
import Link from 'next/link';
import type { QuestionWithTags } from '@/types';
import type { SearchHistory } from '@/types';

type SortOption = 'newest' | 'oldest' | 'popular';

export default function SearchPage() {
  const [questions, setQuestions] = useState<QuestionWithTags[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [searchText, selectedTags, questions, sortBy]);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await getSupabase().auth.getUser();

      // 未登录用户直接返回空列表
      if (!user) {
        setQuestions([]);
        setAvailableTags([]);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setIsAdmin(user.user_metadata?.is_admin === true);

      const supabase = getSupabase();

      // 获取用户加入的班级ID列表
      let userClassIds: string[] = [];
      try {
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id);
        userClassIds = classMembers?.map((c: any) => c.class_id) || [];
      } catch (err) {
        // 表可能还不存在，忽略
        console.log('class_members 表可能不存在');
      }

      // 如果用户没有班级，返回空列表
      if (userClassIds.length === 0) {
        setQuestions([]);
        setAvailableTags([]);
        setLoading(false);
        return;
      }

      // 构建查询：只显示用户班级中的题目
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          *,
          tags (
            id,
            name
          )
        `)
        .eq('status', 'approved')
        .in('class_id', userClassIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取题目失败:', error);
      } else {
        const formattedQuestions = (questionsData || []).map((q: any) => ({
          ...q,
          tags: q.tags || []
        }));
        setQuestions(formattedQuestions);
      }

      const allTags = await getAllTags();
      setAvailableTags(allTags);
    } catch (err) {
      console.error('加载数据失败:', err);
      setQuestions([]);
      setAvailableTags([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSearchHistory = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const supabase = getSupabase();
    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setSearchHistory(data);
    }
  };

  const saveSearchHistory = async (query: string) => {
    if (!query.trim()) return;
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const supabase = getSupabase();
    await supabase.from('search_history').insert({
      user_id: user.id,
      query: query.trim(),
    });

    loadSearchHistory();
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(q =>
        q.question_text?.toLowerCase().includes(lowerSearch) ||
        q.answer_text?.toLowerCase().includes(lowerSearch)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(q =>
        selectedTags.every(tag =>
          q.tags?.some((t: any) => t.name === tag)
        )
      );
    }

    // 排序
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'popular':
        // 这里可以用 favorites_count 排序，暂时用创建时间
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredQuestions(filtered);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim()) {
      saveSearchHistory(value);
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (query: string) => {
    setSearchText(query);
    setShowHistory(false);
  };

  const clearHistory = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const supabase = getSupabase();
    await supabase.from('search_history').delete().eq('user_id', user.id);
    setSearchHistory([]);
  };

  const hotTags = availableTags.slice(0, 10);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* 搜索栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* 搜索输入 */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setShowHistory(e.target.value.length > 0);
                }}
                onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchText);
                  }
                }}
                placeholder="搜索题目或答案内容..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />

              {/* 搜索历史 */}
              {showHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">搜索历史</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      清空
                    </button>
                  </div>
                  {searchHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistoryClick(item.query)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* 排序选项 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">排序:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="newest">最新</option>
                  <option value="oldest">最早</option>
                  <option value="popular">热门</option>
                </select>
              </div>

              {/* 结果统计 */}
              <div className="text-gray-500 text-sm">
                找到 <span className="font-medium text-gray-900">{filteredQuestions.length}</span> 道题目
              </div>
            </div>

            {/* 标签筛选 */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500 self-center mr-2">标签筛选:</span>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                  >
                    清除筛选
                  </button>
                )}
              </div>
            )}

            {/* 热门标签 */}
            {!showHistory && hotTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500 self-center mr-2">热门:</span>
                {hotTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchText(tag)}
                    className="px-3 py-1 text-sm rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {currentUserId ? (
                questions.length === 0 ? '还没有题目，去上传第一道吧！' : '没有找到匹配的题目'
              ) : (
                <>
                  请先 <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">登录</Link> 后查看题库
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredQuestions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  {/* 题目预览 */}
                  <div className="mb-3">
                    {question.question_text && (
                      <p className="text-gray-800 line-clamp-2">{question.question_text}</p>
                    )}
                    {question.question_image_url && (
                      <img
                        src={question.question_image_url}
                        alt="题目"
                        className="mt-2 max-h-32 rounded-lg object-cover"
                      />
                    )}
                  </div>

                  {/* 标签 */}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {question.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 底部信息 */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-sm text-gray-500">
                    <span>
                      {new Date(question.created_at).toLocaleDateString('zh-CN')}
                    </span>
                    <span>点击查看详情 →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
