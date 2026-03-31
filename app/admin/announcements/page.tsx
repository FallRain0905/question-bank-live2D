'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AnnouncementsAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/login';
      return;
    }

    // 检查是否是管理员 - 从 user_metadata 或 user_profiles 中检查
    const isAdmin = user.user_metadata?.is_admin === true ||
                      user.email === '3283254551@qq.com';

    if (!isAdmin) {
      alert('只有管理员才能访问此页面');
      window.location.href = '/';
      return;
    }

    setUser(user);
    await loadAnnouncements();
  };

  const loadAnnouncements = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    setAnnouncements(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    setSubmitting(true);

    // 获取当前用户的 session token
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      alert('请先登录');
      setSubmitting(false);
      return;
    }

    // 创建带认证上下文的客户端用于 RLS 操作
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
      if (editingId) {
        // 更新
        const { error } = await authSupabase
          .from('announcements')
          .update({
            title: title.trim(),
            content: content.trim(),
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // 创建
        const { error } = await authSupabase
          .from('announcements')
          .insert({
            title: title.trim(),
            content: content.trim(),
            is_active: isActive,
            created_by: user.id,
          });

        if (error) throw error;
      }

      // 重置表单
      setTitle('');
      setContent('');
      setIsActive(true);
      setEditingId(null);
      setShowCreateModal(false);

      // 重新加载公告列表
      await loadAnnouncements();
    } catch (err: any) {
      alert('操作失败: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setTitle(announcement.title);
    setContent(announcement.content);
    setIsActive(announcement.is_active);
    setEditingId(announcement.id);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条公告吗？')) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      alert('删除失败');
      return;
    }

    await loadAnnouncements();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('操作失败');
      return;
    }

    await loadAnnouncements();
  };

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
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
              onClick={() => {
                setTitle('');
                setContent('');
                setIsActive(true);
                setEditingId(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + 新建公告
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">还没有公告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white rounded-xl shadow-sm border p-6 ${
                  !announcement.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {announcement.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      创建于 {new Date(announcement.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(announcement.id, announcement.is_active)}
                      className={`px-3 py-1 text-sm rounded ${
                        announcement.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {announcement.is_active ? '已启用' : '已停用'}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* 创建/编辑弹窗 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingId ? '编辑公告' : '新建公告'}
              </h2>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标题
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="公告标题"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内容
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="公告内容"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    立即启用
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setTitle('');
                    setContent('');
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
