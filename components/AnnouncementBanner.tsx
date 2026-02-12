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
  const [showBanner, setShowBanner] = useState(false);

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
          setShowBanner(true);
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

    setShowBanner(false);
  };

  const isAdmin = () => {
    // 检查当前用户是否是管理员（你的邮箱）
    return currentUser?.email === '3283254551@qq.com';
  };

  if (!currentUser || loading) return null;

  if (!showBanner || !announcement) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-blue-600 text-white">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📢</span>
              <h3 className="font-semibold">{announcement.title}</h3>
            </div>
            <p className="text-sm opacity-90">{announcement.content}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAsViewed}
              className="text-blue-100 hover:text-white transition"
            >
              知道了
            </button>
            {isAdmin() && (
              <button
                onClick={() => {
                  // 管理员可以点击编辑（后续实现）
                  window.open('/admin/announcements', '_blank');
                }}
                className="text-blue-100 hover:text-white transition text-sm"
              >
                管理
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
