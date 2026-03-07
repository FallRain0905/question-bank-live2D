'use client';

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 合并初始化，减少重复调用
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      loadCurrentUserAndAnnouncement();
      setInitialized(true);
    }
  }, []);

  const loadCurrentUserAndAnnouncement = async () => {
    try {
      const supabase = getSupabase();

      const [userResult, announcementResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ]);

      const user = userResult.data.user;
      setCurrentUser(user);

      if (announcementResult.data) {
        const data = announcementResult.data;
        setAnnouncement(data);
        // 检查是否已查看过
        const viewedAnnouncements = JSON.parse(localStorage.getItem('viewedAnnouncements') || '[]');
        if (!viewedAnnouncements.includes(data.id)) {
          setShowModal(true);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('加载公告失败:', err);
      setLoading(false);
    }
  };

  const markAsViewed = async () => {
    if (!announcement || !currentUser) return;

    // 保存到本地存储
    const viewedAnnouncements = JSON.parse(localStorage.getItem('viewedAnnouncements') || '[]');
    if (!viewedAnnouncements.includes(announcement.id)) {
      viewedAnnouncements.push(announcement.id);
      localStorage.setItem('viewedAnnouncements', JSON.stringify(viewedAnnouncements));
    }

    // 记录到数据库
    try {
      const supabase = getSupabase();
      await supabase
        .from('announcement_views')
        .insert({ announcement_id: announcement.id, user_id: currentUser.id });
    } catch (err) {
      console.error('记录公告查看失败:', err);
    }

    setShowModal(false);
  };

  const isAdmin = () => {
    // 检查当前用户是否是管理员（你的邮箱）
    return currentUser?.email === '3283254551@qq.com';
  };

  if (!currentUser || loading) return null;

  if (!showModal || !announcement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📢</span>
              <h2 className="text-2xl font-bold text-white">{announcement.title}</h2>
            </div>
            <button
              onClick={() => {
                // 点击右上角 X 也可以关闭，但只记录查看不标记
                setShowModal(false);
              }}
              className="text-white/70 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="prose prose max-w-none">
            <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <p className="text-sm text-gray-500">
            发布时间：{new Date(announcement.created_at).toLocaleString('zh-CN')}
          </p>
          <button
            onClick={markAsViewed}
            className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            确定
          </button>
        </div>

        {/* 管理员链接 */}
        {isAdmin() && (
          <div className="bg-gray-100 px-6 py-2 border-t border-gray-200">
            <button
              onClick={() => {
                window.open('/admin/announcements', '_blank');
              }}
              className="text-sm text-gray-600 hover:text-blue-600 transition"
            >
              管理公告 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
