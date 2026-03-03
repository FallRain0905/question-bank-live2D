'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
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
  const [userClassIds, setUserClassIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, { username?: string; avatar_url?: string; email: string }>>(new Map());

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
      try {
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('status', 'approved');
        setUserClassIds(classMembers?.map((c: any) => c.class_id) || []);
      } catch (err) {
        // 表可能还不存在，忽略
        setUserClassIds([]);
      }

      // 管理员可以查看所有题目，普通用户只能查看自己班级的题目或公开题目
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取题目失败:', error);
        setQuestions([]);
      } else {
        // 获取用户信息用于显示头像和昵称
        const userIds = [...new Set((questionsData || []).map(q => q.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, username, avatar_url, email')
            .in('id', userIds);
          const profileMap = new Map();
          profiles?.forEach(p => profileMap.set(p.id, p));
          setUserProfiles(profileMap);
        }

        const formattedQuestions = (questionsData || []).map((q: any) => ({
          ...q,
          tags: q.tags || [],
          user_name: userProfiles.get(q.user_id)?.username,
          user_avatar_url: userProfiles.get(q.user_id)?.avatar_url,
        }));

        setQuestions(formattedQuestions);
      }
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

    // 过滤可见性：管理员可以看到全部，普通用户只能看到公开题目或自己班级的题目
    if (!isAdmin) {
      filtered = filtered.filter(q =>
        q.visibility === 'public' || (q.class_id && userClassIds.includes(q.class_id))
      );
    }

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

  const getUserAvatar = (question: QuestionWithTags) => {
    const profile = userProfiles.get(question.user_id);
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt={profile.username || '用户'}
          className="w-10 h-10 rounded-full object-cover border-2 border-brand-600"
        />
      );
    }
    const displayName = profile?.username || profile?.email?.[0]?.toUpperCase() || '?';
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 font-medium border-2 border-brand-600">
        {displayName}
      </div>
    );
  };

  const getDisplayName = (question: QuestionWithTags) => {
    const profile = userProfiles.get(question.user_id);
    return profile?.username || '用户';
  };

  const hotTags = availableTags.slice(0, 10);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-950">
      {/* 搜索栏 */}
      <div className="bg-brand-800/50 backdrop-blur-md border-b border-brand-700 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
                className="w-full px-4 py-2.5 bg-brand-900 border border-brand-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-brand-100 placeholder-brand-500"
              />
              {/* 搜索历史 */}
              {showHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-brand-800 border border-brand-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-brand-700 flex justify-between items-center">
                    <span className="text-sm font-medium text-brand-200">搜索历史</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-brand-400 hover:text-brand-200"
                    >
                      清空
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {searchHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryClick(item.query)}
                        className="w-full text-left px-4 py-2 text-sm text-brand-200 hover:bg-brand-700 rounded-lg transition-colors"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 排序选项 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-400">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 bg-brand-900 border border-brand-700 rounded-lg text-sm focus:ring-brand-500 outline-none text-brand-200"
              >
                <option value="newest">最新</option>
                <option value="oldest">最早</option>
              </select>
            </div>
          </div>

          {/* 标签筛选 */}
          {availableTags.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 items-center mt-4">
              <span className="text-sm text-brand-400">标签:</span>
              <div className="flex flex-wrap gap-2">
                {hotTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition ${
                      selectedTags.includes(tag)
                        ? 'bg-brand-500 text-brand-50'
                        : 'bg-brand-800 text-brand-300 hover:bg-brand-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1 text-xs bg-red-900/50 text-red-400 hover:bg-red-900/70 rounded-full"
                >
                  清除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 题目列表 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-brand-200 mb-2">没有找到相关题目</h3>
            <p className="text-brand-400">
              {!currentUserId && '请先登录查看题目'}
              {currentUserId && isAdmin && '请先上传一些题目'}
              {currentUserId && !isAdmin && '试试其他搜索词或标签'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredQuestions.map((question) => (
              <Link
                key={question.id}
                href={`/questions/${question.id}`}
                className="block"
              >
                <div className="bg-brand-800/50 border border-brand-700/50 rounded-xl p-5 hover:border-brand-500/50 hover:bg-brand-700/30 transition-all">
                  {/* 顶部信息 */}
                  <div className="flex items-start gap-3 mb-4">
                    {getUserAvatar(question)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-400">
                        {getDisplayName(question)} · {new Date(question.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* 题目内容 */}
                  <div className="mb-4">
                    {question.question_file_url && (
                      <div className="mb-2 p-2 bg-brand-700/30 border border-brand-600/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-brand-200">
                          <span>📄</span>
                          <span>{question.question_file_name || '题目文档'}</span>
                        </div>
                      </div>
                    )}
                    {question.question_text && (
                      <p className="text-brand-100 line-clamp-2 leading-relaxed">
                        {question.question_text}
                      </p>
                    )}
                    {question.question_image_url && (
                      <img
                        src={question.question_image_url}
                        alt="题目"
                        className="mt-2 max-h-48 w-full rounded-lg object-cover"
                      />
                    )}
                  </div>

                  {/* 答案预览 */}
                  {(question.answer_text || question.answer_image_url || question.answer_file_url) && (
                    <div className="pt-3 border-t border-brand-700/50">
                      <p className="text-xs text-brand-500 mb-2">答案</p>
                      {question.answer_file_url && (
                        <div className="flex items-center gap-2 text-sm text-brand-300">
                          <span>📄</span>
                          <span>{question.answer_file_name || '答案文档'}</span>
                        </div>
                      )}
                      {question.answer_text && (
                        <p className="text-sm text-brand-400 line-clamp-2">
                          {question.answer_text.substring(0, 100)}...
                        </p>
                      )}
                      {question.answer_image_url && (
                        <img
                          src={question.answer_image_url}
                          alt="答案"
                          className="mt-2 max-h-32 w-full rounded-lg object-cover opacity-50"
                        />
                      )}
                    </div>
                  )}

                  {/* 标签 */}
                  {question.tags && question.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-3 border-t border-brand-700/50">
                      {question.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 text-xs bg-brand-700 text-brand-300 rounded-full"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
