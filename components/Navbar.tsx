'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '@/types';
import { getSupabase, clearSupabaseCache } from '@/lib/supabase';

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClassModerator, setIsClassModerator] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'discover' | 'create' | 'tools' | 'admin' | 'user' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 使用 ref 来跟踪组件是否已卸载
  const isMounted = useRef(true);
  // 保存初始化函数的引用，避免重复调用
  const initializeUserData = useRef<((userId: string) => Promise<void>) | null>(null);

  // 关闭下拉菜单的点击外部处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
              学
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              学习共享
            </span>
          </Link>

          {/* 桌面导航 */}
          <div className="hidden md:flex items-center gap-1">
            <Dropdown
              trigger="发现"
              isOpen={dropdownOpen === 'discover'}
              onToggle={() => setDropdownOpen(dropdownOpen === 'discover' ? null : 'discover')}
              items={[
                { href: '/search', label: '📚 题库', description: '浏览和搜索题目' },
                { href: '/notes', label: '📝 笔记', description: '查看学习笔记' },
                { href: '/social', label: '💬 学习圈', description: '社区互动' },
                { href: '/classes', label: '🎓 班级', description: '加入学习班级' },
              ]}
            />

            {user && (
              <>
                <Dropdown
                  trigger="创作"
                  isOpen={dropdownOpen === 'create'}
                  onToggle={() => setDropdownOpen(dropdownOpen === 'create' ? null : 'create')}
                  items={[
                    { href: '/upload', label: '📤 上传题目', description: '分享你的题目' },
                    { href: '/notes/upload', label: '📤 上传笔记', description: '分享学习笔记' },
                  ]}
                />

                <Dropdown
                  trigger="工具"
                  isOpen={dropdownOpen === 'tools'}
                  onToggle={() => setDropdownOpen(dropdownOpen === 'tools' ? null : 'tools')}
                  items={[
                    { href: '/parse', label: '🔧 文档转换', description: '解析 PDF/Word' },
                  ]}
                />

                {(user.is_admin || isClassModerator) && (
                  <Dropdown
                    trigger="管理"
                    isOpen={dropdownOpen === 'admin'}
                    onToggle={() => setDropdownOpen(dropdownOpen === 'admin' ? null : 'admin')}
                    items={[
                      ...(user.is_admin || isClassModerator ? [{ href: '/admin', label: '✅ 内容审核', description: '审核题目和笔记' }] : []),
                      ...(user.is_admin ? [{ href: '/admin/announcements', label: '📢 公告管理', description: '发布平台公告' }] : []),
                      ...(user.is_admin ? [{ href: '/admin/tags', label: '🏷️ 标签管理', description: '管理标签体系' }] : []),
                    ]}
                  />
                )}
              </>
            )}
          </div>

          {/* 用户操作 */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* 通知图标 */}
                <div className="relative">
                  <Link
                    href="/notifications"
                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </Link>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                {/* 用户菜单 */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'user' ? null : 'user')}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-sm font-medium">
                      {user.username?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700">
                      {user.username || '我的'}
                    </span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen === 'user' && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-100 py-1 z-50">
                      <Link
                        href="/me"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setDropdownOpen(null)}
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        个人中心
                      </Link>
                      <Link
                        href="/me?tab=favorites"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setDropdownOpen(null)}
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        我的收藏
                      </Link>
                      <hr className="my-1 border-slate-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all hover:shadow-lg"
              >
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-slate-100"
          >
            <div className="space-y-1">
              <MobileLink href="/search" onClick={() => setMobileMenuOpen(false)}>📚 题库</MobileLink>
              <MobileLink href="/notes" onClick={() => setMobileMenuOpen(false)}>📝 笔记</MobileLink>
              <MobileLink href="/social" onClick={() => setMobileMenuOpen(false)}>💬 学习圈</MobileLink>
              <MobileLink href="/classes" onClick={() => setMobileMenuOpen(false)}>🎓 班级</MobileLink>
              {user && (
                <>
                  <MobileLink href="/upload" onClick={() => setMobileMenuOpen(false)}>📤 上传题目</MobileLink>
                  <MobileLink href="/notes/upload" onClick={() => setMobileMenuOpen(false)}>📤 上传笔记</MobileLink>
                  <MobileLink href="/parse" onClick={() => setMobileMenuOpen(false)}>🔧 文档转换</MobileLink>
                  {(user.is_admin || isClassModerator) && (
                    <MobileLink href="/admin" onClick={() => setMobileMenuOpen(false)}>✅ 内容审核</MobileLink>
                  )}
                  {user.is_admin && (
                    <>
                      <MobileLink href="/admin/announcements" onClick={() => setMobileMenuOpen(false)}>📢 公告管理</MobileLink>
                      <MobileLink href="/admin/tags" onClick={() => setMobileMenuOpen(false)}>🏷️ 标签管理</MobileLink>
                    </>
                  )}
                  <hr className="my-2 border-slate-100" />
                  <MobileLink href="/me" onClick={() => setMobileMenuOpen(false)}>👤 个人中心</MobileLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    🚪 退出登录
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

// 下拉菜单组件
function Dropdown({
  trigger,
  isOpen,
  onToggle,
  items,
}: {
  trigger: string;
  isOpen: boolean;
  onToggle: () => void;
  items: { href: string; label: string; description: string }[];
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1 ${
          isOpen
            ? 'bg-primary-50 text-primary-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {trigger}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-100 py-1.5 z-50"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onToggle}
              className="flex flex-col px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="text-slate-700">{item.label}</span>
              <span className="text-xs text-slate-400 mt-0.5">{item.description}</span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// 移动端链接
function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}
