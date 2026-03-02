'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase, getUserProfiles } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';
import { getFileIcon, formatFileSize } from '@/lib/upload';
import type { NoteWithTags, CommentWithUser } from '@/types';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [note, setNote] = useState<NoteWithTags | null>(null);
  const [noteAuthor, setNoteAuthor] = useState<any>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (noteId) {
      loadNote();
      loadComments();
    }
  }, [noteId]);

  useEffect(() => {
    if (user && note) {
      checkLikeStatus();
      checkFavoriteStatus();
      checkFollowStatus();
    }
  }, [user, note]);

  const checkUser = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    setUser(user);
  };

  const loadNote = async () => {
    const supabase = getSupabase();

    // 获取用户加入的班级ID列表
    let userClassIds: string[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id);
        userClassIds = classMembers?.map((c: any) => c.class_id) || [];
      } catch (err) {
        console.log('class_members 表可能不存在');
      }
    }

    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .eq('id', noteId)
      .eq('status', 'approved')
      .single();

    if (error) {
      console.error('获取笔记失败:', error);
      router.push('/notes');
      return;
    }

    if (data) {
      // 检查班级权限：如果笔记有班级，用户必须是该班级成员
      if (data.class_id && (!userClassIds.length || !userClassIds.includes(data.class_id))) {
        console.error('无权访问该笔记');
        router.push('/notes');
        return;
      }

      // 获取上传者用户信息
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user_id)
        .single();

      const userName = profileData?.username || profileData?.display_name || '用户';

      setNote({
        ...data,
        tags: data.tags || [],
        user_name: userName,
      });

      setNoteAuthor(profileData);
    }

    setLoading(false);
  };

  const loadComments = async () => {
    const supabase = getSupabase();

    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('target_type', 'note')
      .eq('target_id', noteId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (data) {
      // 获取所有评论用户 ID
      const userIds = [...new Set(data.map(c => c.user_id))];

      // 使用工具函数批量获取用户信息
      const profileMap = await getUserProfiles(userIds);

      const commentsWithUsers = await Promise.all(
        data.map(async (comment) => {
          const profile = profileMap.get(comment.user_id);
          const displayName = profile?.username || profile?.display_name || '用户';
          const userWithComments = {
            ...comment,
            user: {
              id: comment.user_id,
              username: displayName,
              email: profile?.id || '',
            },
          } as CommentWithUser;

          const { data: replies } = await supabase
            .from('comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          if (replies && replies.length > 0) {
            // 获取回复者的用户 ID
            const replyUserIds = [...new Set(replies.map(r => r.user_id))];
            const replyProfileMap = await getUserProfiles(replyUserIds);

            userWithComments.replies = await Promise.all(
              replies.map(async (reply) => {
                const replyProfile = replyProfileMap.get(reply.user_id);
                const replyDisplayName = replyProfile?.username || replyProfile?.display_name || '用户';
                return {
                  ...reply,
                  user: {
                    id: reply.user_id,
                    username: replyDisplayName,
                    email: replyProfile?.id || '',
                  },
                };
              })
            );
          }

          return userWithComments;
        })
      );

      setComments(commentsWithUsers);
    }
  };

  const checkLikeStatus = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('note_id', noteId)
      .single();

    setIsLiked(!!data);
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'note')
      .eq('target_id', noteId)
      .maybeSingle();

    setIsFavorited(!!data);
  };

  const checkFollowStatus = async () => {
    if (!user || !note) return;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', note.user_id)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const handleLike = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    const supabase = getSupabase();

    if (isLiked) {
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('note_id', noteId);
      setIsLiked(false);
      if (note) setNote({ ...note, likes_count: Math.max(0, note.likes_count - 1) });
    } else {
      await supabase
        .from('likes')
        .insert({ user_id: user.id, note_id: noteId });
      setIsLiked(true);
      if (note) setNote({ ...note, likes_count: note.likes_count + 1 });
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    const supabase = getSupabase();

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', 'note')
        .eq('target_id', noteId);
      setIsFavorited(false);
    } else {
      await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          target_type: 'note',
          target_id: noteId,
        });
      setIsFavorited(true);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!note) return;

    const supabase = getSupabase();

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', note.user_id);
      setIsFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: note.user_id,
        });
      setIsFollowing(true);

      await supabase.from('notifications').insert({
        user_id: note.user_id,
        type: 'follow',
        title: '新增粉丝',
        content: `${user.user_metadata?.username || user.email} 关注了你`,
        link: `/users/${user.id}`,
      });
    }
  };

  const handleComment = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!commentText.trim()) {
      alert('请输入评论内容');
      return;
    }

    const supabase = getSupabase();

    await supabase.from('comments').insert({
      user_id: user.id,
      target_type: 'note',
      target_id: noteId,
      content: commentText.trim(),
    });

    setCommentText('');
    loadComments();

    if (note && note.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: note.user_id,
        type: 'comment',
        title: '新评论',
        content: `${user.user_metadata?.username || user.email} 评论了你的笔记`,
        link: `/notes/${noteId}`,
      });
    }
  };

  const handleReply = async (commentId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!replyText.trim()) {
      alert('请输入回复内容');
      return;
    }

    const supabase = getSupabase();

    await supabase.from('comments').insert({
      user_id: user.id,
      target_type: 'note',
      target_id: noteId,
      content: replyText.trim(),
      parent_id: commentId,
    });

    setReplyText('');
    setReplyTo(null);
    loadComments();

    const comment = comments.find(c => c.id === commentId);
    if (comment && comment.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: comment.user_id,
        type: 'reply',
        title: '新回复',
        content: `${user.user_metadata?.username || user.email} 回复了你的评论`,
        link: `/notes/${noteId}`,
      });
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm('确定要删除这篇笔记吗？')) return;

    const supabase = getSupabase();

    await supabase
      .from('comments')
      .delete()
      .eq('target_type', 'note')
      .eq('target_id', noteId);

    await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    router.push('/notes');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">笔记不存在</div>
      </div>
    );
  }

  const isOwner = user && user.id === note.user_id;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Link
          href="/notes"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          ← 返回笔记列表
        </Link>

        {/* 笔记内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* 标题和操作 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-3xl">{getFileIcon(note.file_name || '')}</div>
                <h1 className="text-2xl font-bold text-gray-900">{note.title}</h1>
              </div>
              {note.description && (
                <p className="text-gray-600 mt-2">{note.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={`p-2 rounded-lg transition ${
                  isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'
                }`}
                title="点赞"
              >
                {isLiked ? '❤️' : '🤍'}
              </button>
              <span className="text-gray-600">{note.likes_count || 0}</span>
              <button
                onClick={handleFavorite}
                className={`p-2 rounded-lg transition ${
                  isFavorited ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-50'
                }`}
                title="收藏"
              >
                {isFavorited ? '⭐' : '☆'}
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => router.push(`/notes/${noteId}/edit`)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition"
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition"
                    title="删除"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 标签 */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {note.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 文件下载 */}
          {note.file_url && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
              <div className="text-2xl">{getFileIcon(note.file_name || '')}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{note.file_name || '文件'}</p>
                {note.file_size && (
                  <p className="text-sm text-gray-500">{formatFileSize(note.file_size)}</p>
                )}
              </div>
              <a
                href={note.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                下载文件
              </a>
            </div>
          )}

          {/* 上传信息 */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <Link
              href={`/users/${note.user_id}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition"
            >
              {noteAuthor?.avatar_url ? (
                <img src={noteAuthor.avatar_url} alt="头像" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">👤</span>
              )}
              <span>{note.user_name || '用户'}</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                上传于 {formatDistanceToNow(new Date(note.created_at), { locale: zhCN, addSuffix: true })}
              </div>
              <button
                onClick={handleFollow}
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {isFollowing ? '已关注' : '关注'}
              </button>
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">评论 ({comments.length})</h3>

          {user ? (
            <div className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  发表评论
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
              <Link href="/login" className="text-blue-600 hover:text-blue-700">
                登录后参与评论
              </Link>
            </div>
          )}

          <div className="space-y-6">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">还没有评论，快来抢沙发吧！</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                      {comment.user.username?.[0] || comment.user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {comment.user.username || comment.user.email}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { locale: zhCN, addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>

                      {user && (
                        <button
                          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                          className="text-sm text-gray-500 hover:text-blue-600 mt-2"
                        >
                          {replyTo === comment.id ? '取消回复' : '回复'}
                        </button>
                      )}

                      {replyTo === comment.id && (
                        <div className="mt-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`回复 ${comment.user.username || comment.user.email}...`}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm"
                            rows={2}
                          />
                          <div className="flex justify-end mt-2 gap-2">
                            <button
                              onClick={() => {
                                setReplyTo(null);
                                setReplyText('');
                              }}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handleReply(comment.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              回复
                            </button>
                          </div>
                        </div>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-100">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                                {reply.user.username?.[0] || reply.user.email?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {reply.user.username || reply.user.email}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(reply.created_at), { locale: zhCN, addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
