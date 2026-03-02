'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import type { UserProfile } from '@/types';
import { getSupabase, clearSupabaseCache } from '@/lib/supabase';

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClassModerator, setIsClassModerator] = useState(false);

  // 使用 ref 来跟踪组件是否已卸载
  const isMounted = useRef(true);
  // 保存初始化函数的引用，避免重复调用
  const initializeUserData = useRef<((userId: string) => Promise<void>) | null>(null);

  useEffect(() => {
    isMounted.current = true;

    // 统一的用户数据初始化函数
    initializeUserData.current = async (userId: string) => {
      if (!isMounted.current) return;
      loadUnreadCount(userId);
      checkClassModerator(userId);
    };

    const initializeAuth = async () => {
      const supabase = getSupabase();

      // 获取初始会话状态
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user && isMounted.current) {
        const userData: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
          is_admin: session.user.user_metadata?.is_admin === true
        };
        setUser(userData);
        await initializeUserData.current!(session.user.id);
      }
    };

    initializeAuth();

    // 监听认证状态变化（包括初始状态和后续变化）
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;

        if (session?.user) {
          const userData: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
            is_admin: session.user.user_metadata?.is_admin === true
          };
          setUser(userData);
          await initializeUserData.current!(session.user.id);
        } else {
          setUser(null);
          setUnreadCount(0);
          setIsClassModerator(false);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkClassModerator = async (userId: string) => {
    if (!isMounted.current) return;

    const supabase = getSupabase();
    try {
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['creator', 'moderator'])
        .limit(1);

      if (isMounted.current) {
        setIsClassModerator(!!classMembers && classMembers.length > 0);
      }
    } catch (err) {
      // 表可能不存在，忽略
      if (isMounted.current) {
        setIsClassModerator(false);
      }
    }
  };

  const loadUnreadCount = async (userId: string) => {
    if (!isMounted.current) return;

    const supabase = getSupabase();
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (isMounted.current) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('获取未读消息失败:', err);
    }
  };

  const handleLogout = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (!error) {
      // 清除 Supabase 客户端缓存并强制刷新
      clearSupabaseCache();
      window.location.href = '/';
    }
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
            <Link href="/social" className="text-gray-600 hover:text-blue-600 transition">
              学习圈
            </Link>
            <Link href="/classes" className="text-gray-600 hover:text-blue-600 transition">
              班级
            </Link>
            {user && (
              <>
                <Link href="/upload" className="text-gray-600 hover:text-blue-600 transition">
                  上传题目
                </Link>
                <Link href="/notes/upload" className="text-gray-600 hover:text-blue-600 transition">
                  上传笔记
                </Link>
                <Link href="/parse" className="text-gray-600 hover:text-blue-600 transition">
                  文档转换
                </Link>
                {(user.is_admin || isClassModerator) && (
                  <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition">
                    审核
                  </Link>
                )}
                {user.is_admin && (
                  <>
                    <Link href="/admin/announcements" className="text-gray-600 hover:text-blue-600 transition">
                      公告
                    </Link>
                    <Link href="/admin/tags" className="text-gray-600 hover:text-blue-600 transition">
                      标签
                    </Link>
                  </>
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
