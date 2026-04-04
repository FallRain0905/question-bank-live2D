'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import type { UserProfile } from '@/types';
import { getSupabase, clearSupabaseCache } from '@/lib/supabase';
import { themes, getCurrentTheme, setCurrentTheme, initTheme, type Theme } from '@/lib/theme';

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<'discover' | 'create' | 'tools' | 'admin' | 'user' | 'theme' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<Theme>(getCurrentTheme());
  const [imageBackground, setImageBackground] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMounted = useRef(true);

  // 初始化主题和背景
  useEffect(() => {
    initTheme();
    // 加载保存的背景图
    const savedBg = localStorage.getItem('imageBackground');
    if (savedBg) {
      setImageBackground(savedBg);
      document.body.style.setProperty('--bg-image', `url(${savedBg})`);
      document.body.classList.add('has-bg-image');
    }
  }, []);

  // 关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('button') && !target.closest('a') && !target.closest('.absolute')) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 用户认证
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user && isMounted.current) {
        const userData: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
          is_admin: session.user.user_metadata?.is_admin === true
        };
        setUser(userData);
      }
    };

    initializeAuth();

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return;

      if (session?.user) {
        const userData: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username || session.user.user_metadata?.display_name || '',
          is_admin: session.user.user_metadata?.is_admin === true
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // 主题切换
  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    setCurrentThemeState(themes[themeId]);
    setDropdownOpen(null);
  };

  // 图片背景上传 - 上传到服务器
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('🖼️ 开始上传背景图片:', file.name, file.size);

    // 检查文件大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert('图片太大，请选择小于 10MB 的图片');
      return;
    }

    try {
      // 上传到 Nextcloud
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', '背景图片');

      console.log('📤 正在上传文件到服务器...');

      const response = await fetch('/api/upload-background', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 收到服务器响应:', response.status);

      const result = await response.json();

      console.log('📄 服务器返回结果:', result);

      if (!result.success) {
        console.error('❌ 上传失败:', result.error);
        alert('上传失败: ' + result.error);
        return;
      }

      const imageUrl = result.url;
      console.log('✅ 背景图片上传成功:', imageUrl);

      setImageBackground(imageUrl);
      localStorage.setItem('imageBackground', imageUrl);
      document.body.style.setProperty('--bg-image', `url(${imageUrl})`);
      document.body.classList.add('has-bg-image');

      // 清除文件输入，避免重复上传
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setDropdownOpen(null);

    } catch (error: any) {
      console.error('❌ 上传过程中发生错误:', error);
      alert('上传失败: ' + error.message);
    }
  };

  // 移除图片背景
  const removeImageBackground = () => {
    setImageBackground(null);
    localStorage.removeItem('imageBackground');
    document.body.style.removeProperty('--bg-image');
    document.body.classList.remove('has-bg-image');

    // 清除文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setDropdownOpen(null);
  };

  // 登出
  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    clearSupabaseCache();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-brand-200 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
              学
            </div>
            <span className="text-lg font-bold text-brand-700">学习共享</span>
          </Link>

          {/* 桌面端导航 */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/search" className="px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg transition-all">
              题库
            </Link>
            <Link href="/notes" className="px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg transition-all">
              笔记
            </Link>
            <Link href="/classes" className="px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg transition-all">
              班级
            </Link>
	            <Link href="/my-assistant" className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 rounded-lg transition-all shadow-md">
	              🐱 你的专属AI助手
	            </Link>

            {/* 工具菜单 */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'tools' ? null : 'tools')}
                className="px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg transition-all flex items-center gap-1"
              >
                工具
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dropdownOpen === 'tools' && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl border border-brand-200 shadow-lg py-2 z-50">
                  <Link
                    href="/parse"
                    className="block px-4 py-2 text-brand-600 hover:bg-brand-100"
                    onClick={() => setDropdownOpen(null)}
                  >
                    📄 文档题目提取
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 用户操作 */}
          <div className="flex items-center gap-2">
            {/* 主题选择器 */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'theme' ? null : 'theme')}
                className="p-2 text-brand-600 hover:bg-brand-100 rounded-lg transition-all"
                title="切换主题"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828-2.828l5.656 5.657a2 2 0 010 2.828l-1.657 1.657a2 2 0 01-2.828 0l-5.656-5.657a2 2 0 010-2.828z" />
                </svg>
              </button>
              {dropdownOpen === 'theme' && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-brand-200 shadow-lg py-2 z-50">
                  <div className="px-4 py-2 text-xs text-brand-500 font-medium">选择配色主题</div>
                  {Object.values(themes).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        currentTheme.id === theme.id
                          ? 'bg-brand-500 text-white'
                          : 'text-brand-600 hover:bg-brand-100'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ background: `linear-gradient(135deg, ${theme.colors[300]}, ${theme.colors[500]})` }}
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{theme.name}</div>
                        <div className="flex gap-1 mt-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors[400] }} />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors[500] }} />
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors[600] }} />
                        </div>
                      </div>
                      {currentTheme.id === theme.id && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                  
                  {/* 分隔线 */}
                  <div className="border-t border-brand-200 my-2" />
                  
                  {/* 图片主题 */}
                  <div className="px-4 py-2">
                    <label className="block text-xs text-brand-500 mb-2">自定义背景图片</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">上传背景图片</div>
                        <div className="text-xs text-brand-400">自动提取主题色</div>
                      </div>
                    </button>
                    {imageBackground && (
                      <button
                        onClick={removeImageBackground}
                        className="w-full mt-2 px-4 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        移除背景图片
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 用户菜单 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(dropdownOpen === 'user' ? null : 'user')}
                  className="px-4 py-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 transition-all text-sm font-medium"
                >
                  {user.username || '用户'}
                </button>
                {dropdownOpen === 'user' && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-brand-200 shadow-lg py-2 z-50">
                    <Link href={`/users/${user.id}`} className="block px-4 py-2 text-brand-600 hover:bg-brand-100">
                      个人主页
                    </Link>
                    <Link href="/upload" className="block px-4 py-2 text-brand-600 hover:bg-brand-100">
                      上传题目
                    </Link>
                    <Link href="/notes/upload" className="block px-4 py-2 text-brand-600 hover:bg-brand-100">
                      上传笔记
                    </Link>
                    {user.is_admin && (
                      <Link href="/admin" className="block px-4 py-2 text-brand-600 hover:bg-brand-100">
                        管理后台
                      </Link>
                    )}
                    <hr className="my-2 border-brand-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 bg-brand-500 text-white text-sm font-medium rounded-full hover:bg-brand-400 transition-all"
              >
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-brand-600 hover:bg-brand-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand-200">
            <Link href="/search" className="block px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg">
              题库
            </Link>
            <Link href="/notes" className="block px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg">
              笔记
            </Link>
            <Link href="/classes" className="block px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg">
              班级
            </Link>
            {user && (
              <>
                <Link href="/upload" className="block px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg">
                  上传题目
                </Link>
                <Link href="/notes/upload" className="block px-4 py-2 text-brand-600 hover:bg-brand-100 rounded-lg">
                  上传笔记
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
