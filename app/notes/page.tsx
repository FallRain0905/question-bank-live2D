'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { getFileIcon, formatFileSize } from '@/lib/upload';
import Link from 'next/link';
import type { NoteWithTags, SearchHistory } from '@/types';
import NoteCardMobile from '@/components/NoteCardMobile';

type SortOption = 'newest' | 'oldest' | 'popular';

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [likedNoteIds, setLikedNoteIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    filterNotes();
  }, [searchText, selectedTags, notes, sortBy]);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await getSupabase().auth.getUser();

      // 未登录用户直接返回空列表
      if (!user) {
        setNotes([]);
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

      // 管理员可以查看所有笔记，普通用户只能查看自己班级的笔记
      const { data: notesData, error } = await supabase
        .from('notes')
        .select(`
          *,
          tags (
            id,
            name
          )
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // 过滤：管理员看全部，普通用户只看自己班级的
      let filteredNotes = notesData || [];
      if (!isAdmin && userClassIds.length > 0) {
        filteredNotes = filteredNotes.filter((n: any) =>
          userClassIds.includes(n.class_id)
        );
      } else if (!isAdmin && userClassIds.length === 0) {
        // 非管理员且没有班级，返回空列表
        filteredNotes = [];
      }

      if (error) {
        console.error('获取笔记失败:', error);
      } else {
        const formattedNotes = filteredNotes.map((n: any) => ({
          ...n,
          tags: n.tags || [],
          user_name: '用户',
        }));
        setNotes(formattedNotes);
      }

      const { data: likesData } = await supabase
        .from('likes')
        .select('note_id')
        .eq('user_id', user.id);

      if (likesData) {
        setLikedNoteIds(new Set(likesData.map(l => l.note_id)));
      }

      const allTags = await getAllTags();
      setAvailableTags(allTags);
    } catch (err) {
      console.error('加载数据失败:', err);
      setNotes([]);
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

  const getAllTags = async (): Promise<string[]> => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('tags')
      .select('name')
      .order('name');
    return (data || []).map(t => t.name);
  };

  const filterNotes = () => {
    let filtered = [...notes];

    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter(n =>
        n.title?.toLowerCase().includes(lowerSearch) ||
        n.description?.toLowerCase().includes(lowerSearch)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(n =>
        selectedTags.every(tag =>
          n.tags?.some((t: any) => t.name === tag)
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
        filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
    }

    setFilteredNotes(filtered);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleLike = async (noteId: string) => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('请先登录');
      return;
    }

    const isLiked = likedNoteIds.has(noteId);

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('note_id', noteId);

      setLikedNoteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });

      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, likes_count: Math.max(0, n.likes_count - 1) } : n
      ));
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, note_id: noteId });

      setLikedNoteIds(prev => new Set(prev).add(noteId));

      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, likes_count: n.likes_count + 1 } : n
      ));
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    if (value.trim()) {
      saveSearchHistory(value);
      setShowHistory(false);
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
                placeholder="搜索笔记标题或描述..."
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
                  <option value="popular">最热</option>
                </select>
              </div>

              {/* 结果统计 */}
              <div className="text-gray-500 text-sm">
                找到 <span className="font-medium text-gray-900">{filteredNotes.length}</span> 篇笔记
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

      {/* 笔记列表 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {currentUserId ? (
                notes.length === 0 ? '还没有笔记，去上传第一篇吧！' : '没有找到匹配的笔记'
              ) : (
                <>
                  请先 <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">登录</Link> 后查看笔记
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="block"
              >
                {/* 移动端使用优化的卡片组件 */}
                <div className="sm:hidden">
                  <NoteCardMobile
                    note={note}
                    isLiked={likedNoteIds.has(note.id)}
                    onLike={handleLike}
                  />
                </div>

                {/* 桌面端使用原有卡片 */}
                <div className="hidden sm:block">
                  <NoteCard
                    note={note}
                    isLiked={likedNoteIds.has(note.id)}
                    onLike={handleLike}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note, isLiked, onLike }: {
  note: NoteWithTags;
  isLiked: boolean;
  onLike: (noteId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition cursor-pointer">
      {/* 文件图标和标题 */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{getFileIcon(note.file_name || '')}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
          {note.file_name && (
            <p className="text-sm text-gray-500 truncate">{note.file_name}</p>
          )}
        </div>
      </div>

      {/* 描述 */}
      {note.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{note.description}</p>
      )}

      {/* 标签 */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {note.tags.map((tag) => (
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
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{note.user_name || '匿名'}</span>
          {note.file_size && (
            <>
              <span>·</span>
              <span>{formatFileSize(note.file_size)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 下载按钮 */}
          {note.file_url && (
            <a
              href={note.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              下载
            </a>
          )}

          {/* 点赞按钮 */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onLike(note.id);
            }}
            className={`flex items-center gap-1 text-sm transition ${
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span>{note.likes_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
