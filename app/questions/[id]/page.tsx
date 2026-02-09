'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';
import type { QuestionWithTags, CommentWithUser } from '@/types';

export default function QuestionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questionId = params.id as string;

  const [question, setQuestion] = useState<QuestionWithTags | null>(null);
  const [questionAuthor, setQuestionAuthor] = useState<any>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // 未登录时的用户状态检查
  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (questionId) {
      loadQuestion();
      loadComments();
    }
  }, [questionId]);

  useEffect(() => {
    if (user && question) {
      checkFavoriteStatus();
      checkFollowStatus();
    }
  }, [user, question]);

  const checkUser = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    setUser(user);
  };

  const loadQuestion = async () => {
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
      .from('questions')
      .select(`
        *,
        tags (
          id,
          name
        )
      `)
      .eq('id', questionId)
      .eq('status', 'approved')
      .single();

    if (error) {
      console.error('获取题目失败:', error);
      router.push('/search');
      return;
    }

    if (data) {
      // 检查班级权限：如果题目有班级，用户必须是该班级成员
      if (data.class_id && (!userClassIds.length || !userClassIds.includes(data.class_id))) {
        console.error('无权访问该题目');
        router.push('/search');
        return;
      }

      // 获取上传者用户信息
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user_id)
        .single();

      const userName = profileData?.username || profileData?.display_name || '用户';

      setQuestion({
        ...data,
        tags: data.tags || [],
        user_name: userName,
      });

      setQuestionAuthor(profileData);
    }

    setLoading(false);
  };

  const loadComments = async () => {
    const supabase = getSupabase();

    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('target_type', 'question')
      .eq('target_id', questionId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (data) {
      // 获取所有评论用户 ID
      const userIds = [...new Set(data.map(c => c.user_id))];

      // 批量获取用户信息
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // 获取每个评论的用户信息
      const commentsWithUsers = await Promise.all(
        data.map(async (comment) => {
          const profile = profileMap.get(comment.user_id);
          const userWithComments = {
            ...comment,
            user: {
              id: comment.user_id,
              username: profile?.username || profile?.display_name,
              email: profile?.id || '',
            },
          } as CommentWithUser;

          // 获取回复
          const { data: replies } = await supabase
            .from('comments')
            .select('*')
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          if (replies && replies.length > 0) {
            userWithComments.replies = await Promise.all(
              replies.map(async (reply) => {
                const replyProfile = profileMap.get(reply.user_id);
                return {
                  ...reply,
                  user: {
                    id: reply.user_id,
                    username: replyProfile?.username || replyProfile?.display_name,
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

  const checkFavoriteStatus = async () => {
    if (!user) return;
    const supabase = getSupabase();

    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('target_type', 'question')
      .eq('target_id', questionId)
      .single();

    setIsFavorited(!!data);
  };

  const checkFollowStatus = async () => {
    if (!user || !question) return;
    const supabase = getSupabase();

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', question.user_id)
      .single();

    setIsFollowing(!!data);
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
        .eq('target_type', 'question')
        .eq('target_id', questionId);
      setIsFavorited(false);
    } else {
      await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          target_type: 'question',
          target_id: questionId,
        });
      setIsFavorited(true);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert('请先登录');
      return;
    }

    if (!question) return;

    const supabase = getSupabase();

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', question.user_id);
      setIsFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: question.user_id,
        });
      setIsFollowing(true);

      // 创建通知
      await supabase.from('notifications').insert({
        user_id: question.user_id,
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
      target_type: 'question',
      target_id: questionId,
      content: commentText.trim(),
    });

    setCommentText('');
    loadComments();

    // 通知题目作者
    if (question && question.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: question.user_id,
        type: 'comment',
        title: '新评论',
        content: `${user.user_metadata?.username || user.email} 评论了你的题目`,
        link: `/questions/${questionId}`,
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
      target_type: 'question',
      target_id: questionId,
      content: replyText.trim(),
      parent_id: commentId,
    });

    setReplyText('');
    setReplyTo(null);
    loadComments();

    // 通知被回复的用户
    const comment = comments.find(c => c.id === commentId);
    if (comment && comment.user_id !== user.id) {
      await supabase.from('notifications').insert({
        user_id: comment.user_id,
        type: 'reply',
        title: '新回复',
        content: `${user.user_metadata?.username || user.email} 回复了你的评论`,
        link: `/questions/${questionId}`,
      });
    }
  };

  const handleDelete = async () => {
    if (!question) return;
    if (!confirm('确定要删除这道题目吗？')) return;

    const supabase = getSupabase();

    // 删除关联的评论
    await supabase
      .from('comments')
      .delete()
      .eq('target_type', 'question')
      .eq('target_id', questionId);

    // 删除题目
    await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    router.push('/search');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">题目不存在</div>
      </div>
    );
  }

  const isOwner = user && user.id === question.user_id;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Link
          href="/search"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          ← 返回题库
        </Link>

        {/* 题目内容 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {/* 操作按钮 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {question.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full"
                >
                  {tag.name}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
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
                    onClick={() => setIsEditing(true)}
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

          {/* 题目 */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">题目</h2>
            {question.question_text && (
              <p className="text-gray-700 whitespace-pre-wrap">{question.question_text}</p>
            )}
            {question.question_image_url && (
              <img
                src={question.question_image_url}
                alt="题目图片"
                className="mt-3 max-w-full rounded-lg"
              />
            )}
          </div>

          {/* 答案 */}
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">答案</h2>
            {question.answer_text && (
              <p className="text-gray-700 whitespace-pre-wrap">{question.answer_text}</p>
            )}
            {question.answer_image_url && (
              <img
                src={question.answer_image_url}
                alt="答案图片"
                className="mt-3 max-w-full rounded-lg"
              />
            )}
          </div>

          {/* 上传信息 */}
          <div className="border-t border-gray-100 pt-4 mt-6 flex items-center justify-between">
            <Link
              href={`/users/${question.user_id}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition"
            >
              {questionAuthor?.avatar_url ? (
                <img src={questionAuthor.avatar_url} alt="头像" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">👤</span>
              )}
              <span>{question.user_name || '用户'}</span>
            </Link>
            <div className="text-sm text-gray-500">
              上传于 {formatDistanceToNow(new Date(question.created_at), { locale: zhCN, addSuffix: true })}
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">评论 ({comments.length})</h3>

          {/* 评论输入 */}
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

          {/* 评论列表 */}
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

                      {/* 回复按钮 */}
                      {user && (
                        <button
                          onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                          className="text-sm text-gray-500 hover:text-blue-600 mt-2"
                        >
                          {replyTo === comment.id ? '取消回复' : '回复'}
                        </button>
                      )}

                      {/* 回复输入 */}
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

                      {/* 子评论 */}
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
