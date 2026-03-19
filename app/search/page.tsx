'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import type { QuestionWithTags } from '@/types';
import type { SearchHistory } from '@/types';

type SortOption = 'newest' | 'oldest' | 'popular';

// 骨架屏组件
function SkeletonCard() {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-brand-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-brand-200" />
        <div className="flex-1">
          <div className="h-4 bg-brand-200 rounded w-24 mb-2" />
          <div className="h-3 bg-brand-100 rounded w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-brand-100 rounded w-full" />
        <div className="h-4 bg-brand-100 rounded w-3/4" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-brand-100 rounded-full w-16" />
        <div className="h-6 bg-brand-100 rounded-full w-20" />
      </div>
    </div>
  );
}

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

      const { data: classMembers } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      setUserClassIds(classMembers?.map((c: any) => c.class_id) || []);

      // RLS 会处理权限，不需要在前端过滤 status
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select(`
          *,
          tags (
            id,
              name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取题目失败:', error);
        setQuestions([]);
      } else {
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

        // 收集所有标签
        const allTags = new Set<string>();
        formattedQuestions.forEach((q: any) => {
          q.tags?.forEach((t: any) => allTags.add(t.name));
        });
        setAvailableTags(Array.from(allTags));
      }

      setLoading(false);
    } catch (err) {
      console.error('加载题库失败:', err);
      setQuestions([]);
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

  const clearHistory = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const supabase = getSupabase();

    await supabase.from('search_history').delete().eq('user_id', user.id);
    setSearchHistory([]);
  };

  const handleHistoryClick = (query: string) => {
    setSearchText(query);
    setShowHistory(false);
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(q =>
        q.question_text?.toLowerCase().includes(searchLower) ||
        q.answer_text?.toLowerCase().includes(searchLower) ||
        q.question_file_name?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(q =>
        selectedTags.some(tag => q.tags?.some((t: any) => t.name === tag))
      );
    }

    // 可见性过滤：只显示公开题目或用户所属班级的题目
    // RLS 已经在数据库层面过滤了，这里只是为了兼容老数据
    filtered = filtered.filter(q => {
      // 如果没有 visibility 字段，默认显示（向后兼容老数据）
      if (!q.visibility) {
        return q.status === 'approved' || q.user_id === currentUserId;
      }
      // 如果是公开题目且已审核，显示
      if (q.visibility === 'public' && q.status === 'approved') {
        return true;
      }
      // 如果是班级专属题目且已审核，检查用户是否属于该班级
      if (q.visibility === 'class' && q.status === 'approved' && q.class_id) {
        return userClassIds.includes(q.class_id);
      }
      // 创建者总是能看到自己的所有题目（包括待审核的）
      if (q.user_id === currentUserId) {
        return true;
      }
      return false;
    });

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredQuestions(filtered);
  };

  const handleFavorite = async (questionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: 实现收藏功能
    alert('收藏功能开发中');
  };

  const handleSearch = (query: string) => {
    setSearchText(query);
    setShowHistory(false);
    if (query.trim()) {
      saveSearchHistory(query);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getUserAvatar = (question: QuestionWithTags) => {
    const profile = userProfiles.get(question.user_id);
    if (profile?.avatar_url) {
      return (
        <img
          src={profile.avatar_url}
          alt={profile.username || '用户'}
          className="w-10 h-10 rounded-full object-cover border-2 border-brand-300"
        />
      );
    }
    const displayName = profile?.username || '用户';

    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white font-medium border-2 border-brand-300">
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
    <div className="min-h-screen relative">
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none theme-bg-gradient" />
      
      {/* 搜索栏 */}
      <div className="bg-white/80 backdrop-blur-md border-b border-brand-200 sticky top-16 z-40 px-4 py-2 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-brand-600 hover:text-brand-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="sm:hidden">首页</span>
          </Link>

          <div className="relative flex-1">
            <div className="flex flex-col sm:flex-row gap-4">
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
                className="w-full px-4 py-2.5 bg-white/80 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-brand-800 placeholder-brand-500"
              />
              {showHistory && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-brand-50 border border-brand-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-brand-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-brand-700">搜索历史</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-brand-400 hover:text-brand-700"
                    >
                      清空
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {searchHistory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryClick(item.query)}
                        className="w-full text-left px-4 py-2 text-sm text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-brand-400">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-white/80 border border-brand-200 rounded-lg text-sm focus:ring-500 outline-none text-brand-700"
            >
              <option value="newest">最新</option>
              <option value="oldest">最早</option>
            </select>
          </div>

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
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
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

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-brand-700 mb-2">没有找到相关题目</h3>
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
                className="block group"
              >
                <div className="bg-white/80 backdrop-blur-sm border border-brand-200 rounded-xl p-5 hover:border-brand-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden">
                  {/* 悬停时显示的快捷操作 */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        // 快速预览
                        alert('预览功能开发中');
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-brand-50 transition-colors"
                      title="快速预览"
                    >
                      <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFavorite(question.id, e);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm hover:bg-brand-50 transition-colors"
                      title="收藏"
                    >
                      <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-3 mb-4">
                    {getUserAvatar(question)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-400">
                        {getDisplayName(question)} · {new Date(question.created_at).toLocaleDateString()}
                      </p>
                      {/* 显示审核状态 */}
                      {question.status === 'pending' && question.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-yellow-400">待审核</span>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    {question.question_file_url && (
                      <div className="mb-2 p-2 bg-brand-100/30 border border-brand-300/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-brand-700">
                          <span>📄</span>
                          <span>{question.question_file_name || '题目文档'}</span>
                        </div>
                      </div>
                    )}
                    {question.question_text && (
                      <p className="text-brand-800 line-clamp-2 leading-relaxed">
                        {question.question_text}
                      </p>
                    )}
                    {question.question_image_url && (
                      <img
                        src={question.question_image_url}
                        alt="题目"
                        className="mt-2 max-h-48 w-full rounded-full object-cover"
                      />
                    )}
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
