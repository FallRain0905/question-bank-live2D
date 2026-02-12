'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
          // 创建用户公开信息记录
          try {
            await supabase.from('user_profiles').insert({
              id: data.user.id,
              username: username.trim(),
              display_name: username.trim(),
            });
          } catch (err) {
            console.log('创建用户资料失败:', err);
          }

          setError('注册成功！请登录。');
          setIsSignUp(false);
          setUsername('');
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
          // 登录成功 - 使用 router.push 而不是强刷
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
            {isSignUp ? '注册账号' : '登录'}
          </h1>

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
