'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  // 使用 ref 防止组件卸载后更新状态
  const isMounted = useRef(true);

  // 确保只在客户端渲染，避免 hydration 不匹配
  useEffect(() => {
    setIsClient(true);
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // 创建用户资料（通过 API）
  const createUserProfile = async (userId: string, accessToken?: string) => {
    try {
      const response = await fetch('/api/users/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          username: username.trim(),
          displayName: username.trim(),
          accessToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('创建用户资料 API 失败:', result.error);
      }

      return result;
    } catch (err) {
      console.error('创建用户资料请求失败:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return; // 防止重复提交

    setLoading(true);
    setError('');

    const supabase = getSupabase();

    try {
      if (isSignUp) {
        // 注册
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: username.trim(),
            }
          }
        });

        if (error) {
          setError(error.message);
        } else if (data.user) {
          // 尝试创建用户公开信息记录
          if (data.session?.access_token) {
            // 如果有会话（不需要邮箱验证），尝试创建资料
            await createUserProfile(data.user.id, data.session.access_token);
          } else {
            // 需要邮箱验证，使用服务端 API 尝试创建
            await createUserProfile(data.user.id);
          }

          if (data.session) {
            // 注册后自动登录
            setError('注册成功！正在跳转...');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 500);
          } else {
            // 需要邮箱验证
            setError('注册成功！请检查邮箱并点击确认链接，然后登录。');
            setIsSignUp(false);
            setUsername('');
          }
        } else {
          setError('注册失败，请重试');
        }
      } else {
        // 登录
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else if (data.session) {
          // 登录成功 - 检查是否有用户资料
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', data.user.id)
              .maybeSingle();

            // 如果没有用户资料，创建一个
            if (!profile && data.user?.user_metadata?.username) {
              await createUserProfile(data.user.id, data.session.access_token);
            }
          } catch (err) {
            console.log('检查/创建用户资料失败:', err);
          }

          // 使用 router.push 而不是刷新
          router.push('/');
          router.refresh();
          return; // 直接返回，不执行 setLoading(false)
        } else {
          setError('登录失败，请重试');
        }
      }
    } catch (err: any) {
      console.error('登录/注册失败:', err);
      setError(err?.message || '操作失败，请重试');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // 发送密码重置邮件
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetLoading) return;

    setResetLoading(true);
    setError('');

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const result = await response.json();

      if (result.success) {
        setResetSuccess(true);
        setError('密码重置邮件已发送！请检查您的邮箱。');
        setTimeout(() => {
          setResetSuccess(false);
          setResetEmail('');
          setShowForgotPassword(false);
          setError('');
        }, 3000);
      } else {
        setError(result.error || '发送失败，请重试');
      }
    } catch (err: any) {
      console.error('发送密码重置邮件失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      if (isMounted.current) {
        setResetLoading(false);
      }
    }
  };

  // 服务端渲染时显示占位，避免 hydration 不匹配
  if (!isClient) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
            {showForgotPassword ? '忘记密码' : isSignUp ? '注册账号' : '登录'}
          </h1>

          {/* 忘记密码表单 */}
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 *
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={resetLoading}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="请输入注册时的邮箱地址"
                />
              </div>

              <div className="text-xs text-gray-600">
                <p>• 系统将向该邮箱发送密码重置链接</p>
                <p>• 链接有效期为 1 小时</p>
              </div>

              {error && (
                <div className={`p-3 rounded-lg text-sm ${error.includes('已发送') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetLoading ? '发送中...' : '发送密码重置邮件'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            {showForgotPassword ? (
              <>
                还记得密码？
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setResetEmail('');
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  返回登录
                </button>
              </>
            ) : isSignUp ? (
              <>
                已有账号？
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setUsername('');
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  去登录
                </button>
              </>
            ) : (
              <>
                忘记密码？
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setEmail('');
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  重置密码
                </button>
              </>
            )}
          </div>

          {!showForgotPassword && (
            <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                返回首页
              </Link>
            </div>
          )}
            <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 *
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="请输入用户名（至少2个字符）"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="至少6位字符"
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${error.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? '已有账号？' : '还没有账号？'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setUsername('');
              }}
              className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp ? '去登录' : '去注册'}
            </button>
          </div>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <Link href="/reset-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                忘记密码？
              </Link>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
