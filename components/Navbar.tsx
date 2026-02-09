'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // 获取当前用户
    const getCurrentUser = async () => {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          username: user.user_metadata?.username || user.user_metadata?.display_name || '',
          is_admin: user.user_metadata?.is_admin === true
        });
        loadUnreadCount(user.id);
      }
    };

    getCurrentUser();

    // 监听登录状态变化
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
            is_admin: session.user.user_metadata?.is_admin === true
          });
          loadUnreadCount(session.user.id);
        } else {
          setUser(null);
          setUnreadCount(0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUnreadCount = async (userId: string) => {
    const supabase = getSupabase();
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
  };

  const getDisplayName = () => {
    if (user?.username) return user.username;
    if (user?.display_name) return user.display_name;
    return user?.email || '';
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-blue-600">
            学习共享
          </Link>

          {/* 导航链接 */}
          <div className="flex items-center gap-6">
            <Link href="/search" className="text-gray-600 hover:text-blue-600 transition">
              题库
            </Link>
            <Link href="/notes" className="text-gray-600 hover:text-blue-600 transition">
              笔记
            </Link>
            {user && (
              <>
                <Link href="/upload" className="text-gray-600 hover:text-blue-600 transition">
                  上传题目
                </Link>
                <Link href="/notes/upload" className="text-gray-600 hover:text-blue-600 transition">
                  上传笔记
                </Link>
                {user.is_admin && (
                  <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition">
                    审核
                  </Link>
                )}
              </>
            )}
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* 通知图标 */}
                <div className="relative">
                  <Link
                    href="/notifications"
                    className="text-gray-600 hover:text-blue-600 transition p-2"
                  >
                    🔔
                  </Link>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                <Link href="/me" className="text-sm text-gray-600 hover:text-blue-600 transition">
                  我的
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 transition"
                >
                  退出
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                登录 / 注册
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
