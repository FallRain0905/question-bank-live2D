'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '@/types';
import { getSupabase, clearSupabaseCache } from '@/lib/supabase';
import { themes, getCurrentTheme, setCurrentTheme, initTheme, type Theme } from '@/lib/theme';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

const mainNavItems: NavItem[] = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/search', label: '题库', icon: '📚', description: '浏览和搜索题目' },
  { href: '/notes', label: '笔记', icon: '📝', description: '查看学习笔记' },
  { href: '/social', label: '学习圈', icon: '💬', description: '社区互动' },
  { href: '/classes', label: '班级', icon: '🎓', description: '加入学习班级' },
];

const createNavItems: NavItem[] = [
  { href: '/upload', label: '上传题目', icon: '📤' },
  { href: '/notes/upload', label: '上传笔记', icon: '📤' },
];

const toolNavItems: NavItem[] = [
  { href: '/parse', label: '文档转换', icon: '🔧' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClassModerator, setIsClassModerator] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<Theme>(getCurrentTheme());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    initTheme();

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
          is_admin: session.user.user_metadata?.is_admin === true
        };
        setUser(userData);
        loadUnreadCount(session.user.id);
        checkClassModerator(session.user.id);
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userData: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
            is_admin: session.user.user_metadata?.is_admin === true
          };
          setUser(userData);
          loadUnreadCount(session.user.id);
          checkClassModerator(session.user.id);
        } else {
          setUser(null);
          setUnreadCount(0);
          setIsClassModerator(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkClassModerator = async (userId: string) => {
    const supabase = getSupabase();
    try {
      const { data: classMembers } = await supabase
        .from('class_members')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['creator', 'moderator'])
        .limit(1);
      setIsClassModerator(!!classMembers && classMembers.length > 0);
    } catch (err) {
      setIsClassModerator(false);
    }
  };

  const loadUnreadCount = async (userId: string) => {
    const supabase = getSupabase();
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('获取未读消息失败:', err);
    }
  };

  const handleLogout = async () => {
    const { error } = await getSupabase().auth.signOut();
    if (!error) {
      clearSupabaseCache();
      window.location.href = '/';
    }
  };

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    setCurrentThemeState(themes[themeId]);
    setThemeOpen(false);
  };

  const NavItem = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
          isActive
            ? 'bg-brand-500/20 text-brand-400 font-medium'
            : 'text-brand-400 hover:bg-brand-800/50 hover:text-brand-300'
        }`}
      >
        <span className="text-lg">{item.icon}</span>
        {!collapsed && <span className="text-sm">{item.label}</span>}
        {isActive && !collapsed && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-brand-950 border-r border-brand-800 transition-all duration-300 z-50 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-brand-800">
          {!collapsed ? (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 font-bold text-sm">
                学
              </div>
              <span className="text-lg font-bold text-brand-100">学习共享</span>
            </Link>
          ) : (
            <Link href="/" className="mx-auto">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 font-bold text-sm">
                学
              </div>
            </Link>
          )}
          {/* 折叠按钮 */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-brand-500 hover:bg-brand-800 rounded-lg transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* 主导航 */}
        <div className="p-3 overflow-y-auto h-[calc(100%-12rem)]">
          {!collapsed && <div className="px-1 mb-2 text-xs text-brand-600 font-medium">发现</div>}
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}

          {user && (
            <>
              {!collapsed && <div className="px-1 mt-4 mb-2 text-xs text-brand-600 font-medium">创作</div>}
              {createNavItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}

              {!collapsed && <div className="px-1 mt-4 mb-2 text-xs text-brand-600 font-medium">工具</div>}
              {toolNavItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}

              {(user.is_admin || isClassModerator) && (
                <>
                  {!collapsed && <div className="px-1 mt-4 mb-2 text-xs text-brand-600 font-medium">管理</div>}
                  {user.is_admin && (
                    <NavItem item={{ href: '/admin/classes', label: '班级审核', icon: '🎓' }} />
                  )}
                  {user.is_admin && (
                    <NavItem item={{ href: '/admin/announcements', label: '公告管理', icon: '📢' }} />
                  )}
                  {user.is_admin && (
                    <NavItem item={{ href: '/admin/tags', label: '标签管理', icon: '🏷️' }} />
                  )}
                  {user.is_admin && (
                    <NavItem item={{ href: '/admin/settings', label: '系统配置', icon: '⚙️' }} />
                  )}
                  <NavItem item={{ href: '/admin', label: '内容审核', icon: '✅' }} />
                </>
              )}
            </>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-brand-800 bg-brand-950/50 backdrop-blur">
          {/* 主题选择器 */}
          <div className="p-2 border-b border-brand-800">
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              className={`flex items-center justify-center w-full p-2 text-brand-400 hover:bg-brand-800/50 rounded-lg transition-colors ${
                collapsed ? '' : 'gap-2'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828-2.828l5.656 5.657a2 2 0 010 2.828l-1.657 1.657a2 2 0 01-2.828 0l-5.656-5.657a2 2 0 010-2.828z" />
              </svg>
              {!collapsed && <span className="text-sm">主题</span>}
            </button>

            {themeOpen && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 p-2 bg-brand-900 rounded-lg"
              >
                {Object.values(themes).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`w-full px-3 py-2 flex items-center gap-2 rounded-lg transition-colors ${
                      currentTheme.id === theme.id
                        ? 'bg-brand-700 text-brand-100'
                        : 'text-brand-300 hover:bg-brand-800'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors[400]}, ${theme.colors[600]})`,
                      }}
                    />
                    <span className="text-xs font-medium">{theme.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* 用户信息 */}
          <div className="p-2">
            {user ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center w-full p-2 hover:bg-brand-800/50 rounded-lg transition-colors ${
                      collapsed ? 'justify-center' : 'gap-2'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 text-sm font-medium">
                      {user.username?.[0] || user.email[0].toUpperCase()}
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-brand-200 truncate">
                          {user.username || '我的'}
                        </div>
                        <div className="text-xs text-brand-500 truncate">{user.email}</div>
                      </div>
                    )}
                  </button>

                  {userMenuOpen && !collapsed && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-full left-0 mb-1 w-full bg-brand-800 rounded-lg border border-brand-700 py-1"
                    >
                      <Link
                        href="/notifications"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-between px-3 py-2 text-sm text-brand-200 hover:bg-brand-700"
                      >
                        <span>通知</span>
                        {unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] bg-brand-500 text-brand-50 text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/me"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-brand-200 hover:bg-brand-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        个人中心
                      </Link>
                      <Link
                        href="/me?tab=favorites"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-brand-200 hover:bg-brand-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        我的收藏
                      </Link>
                      <hr className="my-1 border-brand-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-300 hover:bg-brand-700 hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        退出登录
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className={`flex items-center justify-center w-full p-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400 transition-colors ${
                  collapsed ? '' : 'gap-2'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {!collapsed && <span className="text-sm font-medium">登录</span>}
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
