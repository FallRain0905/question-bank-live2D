'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { getFileIcon, formatFileSize, deleteFile, uploadAvatar } from '@/lib/upload';
import Link from 'next/link';
import type { QuestionWithTags, NoteWithTags } from '@/types';

type TabType = 'questions' | 'notes' | 'favorites';

export default function MePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('questions');
  const [questions, setQuestions] = useState<QuestionWithTags[]>([]);
  const [notes, setNotes] = useState<NoteWithTags[]>([]);
  const [favorites, setFavorites] = useState<{ questions: QuestionWithTags[], notes: NoteWithTags[] }>({
    questions: [],
    notes: []
  });
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadData();
      setNewUsername(user.user_metadata?.username || user.user_metadata?.display_name || '');
    }
  }, [user, activeTab]);

  const checkUser = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const loadUserProfile = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      setUserProfile(data);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim() || newUsername.length < 2) {
      alert('用户名至少需要2个字符');
      return;
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({
      data: {
        username: newUsername.trim(),
        display_name: newUsername.trim(),
      }
    });

    if (error) {
      alert('更新失败: ' + error.message);
    } else {
      // 更新 user_profiles 表
      await supabase
        .from('user_profiles')
        .update({
          username: newUsername.trim(),
          display_name: newUsername.trim(),
        })
        .eq('id', user.id);

      // 重新获取用户信息
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await loadUserProfile();
      setEditingUsername(false);
      alert('用户名更新成功！');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);

    try {
      const { url } = await uploadAvatar(file, user.id);

      // 更新数据库
      const supabase = getSupabase();
      await supabase
        .from('user_profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      // 重新加载用户信息
      await loadUserProfile();
      alert('头像更新成功！');
    } catch (error: any) {
      alert('上传失败: ' + error.message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    const supabase = getSupabase();

    if (activeTab === 'questions') {
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          *,
          tags (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setQuestions((questionsData || []).map((q: any) => ({
        ...q,
        tags: q.tags || []
      })));
    } else if (activeTab === 'notes') {
      const { data: notesData } = await supabase
        .from('notes')
        .select(`
          *,
          tags (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setNotes((notesData || []).map((n: any) => ({
        ...n,
        tags: n.tags || []
      })));
    } else if (activeTab === 'favorites') {
      // 获取收藏的题目
      const { data: favQuestions } = await supabase
        .from('favorites')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'question');

      if (favQuestions && favQuestions.length > 0) {
        const questionIds = favQuestions.map(f => f.target_id);
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*, tags(id, name)')
          .in('id', questionIds)
          .eq('status', 'approved');
        setFavorites(prev => ({ ...prev, questions: questionsData || [] }));
      } else {
        setFavorites(prev => ({ ...prev, questions: [] }));
      }

      // 获取收藏的笔记
      const { data: favNotes } = await supabase
        .from('favorites')
        .select('target_id')
        .eq('user_id', user.id)
        .eq('target_type', 'note');

      if (favNotes && favNotes.length > 0) {
        const noteIds = favNotes.map(f => f.target_id);
        const { data: notesData } = await supabase
          .from('notes')
          .select('*, tags(id, name)')
          .in('id', noteIds)
          .eq('status', 'approved');
        setFavorites(prev => ({ ...prev, notes: notesData || [] }));
      } else {
        setFavorites(prev => ({ ...prev, notes: [] }));
      }
    }

    setLoading(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;

    const supabase = getSupabase();
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    }
  };

  const handleDeleteNote = async (note: NoteWithTags) => {
    if (!confirm('确定要删除这篇笔记吗？')) return;

    const supabase = getSupabase();

    // 删除文件
    if (note.file_url) {
      try {
        const path = note.file_url.split('/').pop();
        if (path) {
          await deleteFile(`notes/${path}`, 'files');
        }
      } catch (err) {
        console.error('删除文件失败:', err);
      }
    }

    // 删除记录
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', note.id);

    if (error) {
      alert('删除失败: ' + error.message);
    } else {
      setNotes(prev => prev.filter(n => n.id !== note.id));
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const displayName = userProfile?.username || userProfile?.display_name || user.user_metadata?.username || user.user_metadata?.display_name || user.email;
  const hasUsername = !!userProfile?.username || !!user.user_metadata?.username;
  const avatarUrl = userProfile?.avatar_url;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* 用户信息 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 头像 */}
              <div
                className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl overflow-hidden ${
                  avatarUrl ? '' : 'bg-blue-100'
                } ${uploadingAvatar ? 'opacity-50' : 'cursor-pointer hover:opacity-80 transition'}`}
                onClick={!uploadingAvatar ? handleAvatarClick : undefined}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <span>👤</span>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div>
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="输入用户名"
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      minLength={2}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateUsername();
                        if (e.key === 'Escape') {
                          setEditingUsername(false);
                          setNewUsername(user.user_metadata?.username || user.user_metadata?.display_name || '');
                        }
                      }}
                    />
                    <button
                      onClick={handleUpdateUsername}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingUsername(false);
                        setNewUsername(user.user_metadata?.username || user.user_metadata?.display_name || '');
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                    <button
                      onClick={() => setEditingUsername(true)}
                      className="text-gray-400 hover:text-blue-600 transition"
                      title="修改用户名"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'questions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              我的题目 ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              我的笔记 ({notes.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-4 px-2 border-b-2 font-medium transition ${
                activeTab === 'favorites'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              我的收藏 ({favorites.questions.length + favorites.notes.length})
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'questions' && questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            还没有上传题目，<Link href="/upload" className="text-blue-600 hover:underline">去上传</Link>
          </div>
        ) : activeTab === 'notes' && notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            还没有上传笔记，<Link href="/notes/upload" className="text-blue-600 hover:underline">去上传</Link>
          </div>
        ) : activeTab === 'favorites' && favorites.questions.length === 0 && favorites.notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            还没有收藏任何内容
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'questions'
              ? questions.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    onDelete={handleDeleteQuestion}
                  />
                ))
              : activeTab === 'notes'
              ? notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onDelete={handleDeleteNote}
                  />
                ))
              : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">收藏的题目</h3>
                  {favorites.questions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 mb-8">还没有收藏题目</p>
                  ) : (
                    <div className="space-y-4 mb-8">
                      {favorites.questions.map((question) => (
                        <Link
                          key={question.id}
                          href={`/questions/${question.id}`}
                          className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
                        >
                          <p className="text-gray-800">{question.question_text}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                  <h3 className="text-lg font-medium text-gray-900 mb-4">收藏的笔记</h3>
                  {favorites.notes.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">还没有收藏笔记</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {favorites.notes.map((note) => (
                        <Link
                          key={note.id}
                          href={`/notes/${note.id}`}
                          className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
                        >
                          <h3 className="font-medium text-gray-900">{note.title}</h3>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionItem({ question, onDelete }: {
  question: QuestionWithTags;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900">题目</h3>
            {getStatusBadge(question.status)}
          </div>
          {question.question_text && (
            <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-3">
              {question.question_text}
            </p>
          )}
          {question.question_image_url && (
            <img
              src={question.question_image_url}
              alt="题目图片"
              className="mt-2 max-w-xs h-auto rounded-lg border border-gray-200"
            />
          )}
        </div>
        <button
          onClick={() => onDelete(question.id)}
          className="ml-4 text-gray-400 hover:text-red-600 transition"
        >
          删除
        </button>
      </div>

      {(question.tags && question.tags.length > 0) || question.created_at ? (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {question.tags && question.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full"
            >
              {tag.name}
            </span>
          ))}
          <span className="text-xs text-gray-400 ml-auto">
            {new Date(question.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NoteItem({ note, onDelete }: {
  note: NoteWithTags;
  onDelete: (note: NoteWithTags) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className="text-3xl">{getFileIcon(note.file_name || '')}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
            {getStatusBadge(note.status)}
          </div>
          {note.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-1">{note.description}</p>
          )}
          {note.file_name && (
            <p className="text-sm text-gray-500">{note.file_name}</p>
          )}
          {note.file_url && (
            <a
              href={note.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              查看文件
            </a>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {new Date(note.created_at).toLocaleDateString('zh-CN')}
            {note.file_size && ` · ${formatFileSize(note.file_size)}`}
            {` · ${note.likes_count || 0} 个赞`}
          </p>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
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
        </div>
        <button
          onClick={() => onDelete(note)}
          className="text-gray-400 hover:text-red-600 transition"
        >
          删除
        </button>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  const statusMap = {
    pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: '已通过', color: 'bg-green-100 text-green-700' },
    rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
  };
  const s = statusMap[status as keyof typeof statusMap] || statusMap.pending;
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}
