'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const isMounted = useRef(true);

  // 确保只在客户端渲染，避免 hydration 不匹配
  useEffect(() => {
    setIsClient(true);
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // 检查用户是否已登录（通过邮件链接来的用户）
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setHasSession(true);
      } else {
        // 没有会话，说明链接已失效或用户直接访问该页面
        setError('链接已失效，请重新申请密码重置。');
      }
    } catch (err) {
      console.error('检查会话失败:', err);
      setError('检查状态失败，请刷新页面或重新申请。');
    }
  };

  // 密码强度验证
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    if (strength <= 2) return { color: 'text-red-600', text: '密码强度：弱' };
    if (strength <= 4) return { color: 'text-yellow-600', text: '密码强度：中' };
    return { color: 'text-green-600', text: '密码强度：强' };
  };

  // 表单验证
  const validateForm = () => {
    if (newPassword.length < 6) {
      setError('密码长度至少为 6 位字符');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    if (newPassword === password) {
      setError('新密码不能与旧密码相同');
      return false;
    }

    setError('');
    return true;
  };

  // 更新密码
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || !hasSession) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();

      // 更新当前登录用户的密码
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setError(`密码重置失败：${error.message}`);
      } else {
        setSuccess(true);

        // 成功后清理会话并跳转到登录页
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      console.error('密码重置失败:', err);
      setError('操作失败，请稍后重试或联系管理员');
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
            {success ? '密码重置成功' : '设置新密码'}
          </h1>

          {!hasSession && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-8-8 0 1008 0 01-8 8v-2a8 8 0 008-8 0 018 0 01-8 8zm-1-9a1 1 0 00-2 0v2a1 1 0 002 0h2a1 1 0 002-0 0-1 9 0 012 2 3.586 3.586l.707.707a1 1 0 01-1.414 0l-9 9a1 1 0 01-1.414 1.414L3.586 16H2a1 1 0 01-1 0 012 2v2a1 1 0 002 0h2a1 1 0 002 0 00-1 9 0 012-2 3.586-3.586l-.707-.707a1 1 0 011.414 0l9-9a1 1 0 011.414-1.414L16.414 3H18a1 1 0 002 0 00-1 9 0 01-2-3.586-3.586l-.707.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L3.586 2H2a1 1 0 01-1 0 012 2v2a1 1 0 002 0h2a1 1 0 002 0 00-1 9 0 01-2-3.586-3.586l-.707-.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L16.414 17z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-red-800">链接已失效</p>
                  <p className="text-sm text-red-700 mt-1">
                    请在登录页面重新申请密码重置，系统会发送新的重置链接到您的邮箱。
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasSession && !success && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  新密码 *
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="请输入新密码（至少6位字符）"
                />
                {newPassword && (
                  <p className={`text-xs mt-1 ${getPasswordStrength(newPassword).color}`}>
                    {getPasswordStrength(newPassword).text}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码 *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="请再次输入新密码"
                />
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>• 密码长度至少为 6 位字符</p>
                <p>• 建议包含大小写字母、数字和特殊字符</p>
                <p>• 新密码不能与旧密码相同</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '处理中...' : '确认修改密码'}
              </button>
            </form>
          )}

          {success && (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <svg className="w-12 h-12 text-green-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-8-8 0 1008 0 01-8 8v-2a8 8 0 008-8 0 018 0 01-8 8zm3.707-9.293a1 1 0 00-1.414 1.414l-9 9a1 1 0 01-1.414 1.414L3.707 18H17a1 1 0 002 0 00-1 9 0 01-2-3.707-3.707l-.707-.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L16.293 10H3.707a1 1 0 01-1 707-3.707l-.707.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L16.293 5H8.293l.707.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L16.293 8H3.707l.707.707a1 1 0 01-1.414 0l-9-9a1 1 0 01-1.414-1.414L16.293 8z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800 font-medium">密码重置成功！</p>
                <p className="text-sm text-green-700 mt-1">
                  您的密码已成功更新。系统将自动跳转到登录页面，请使用新密码登录。
                </p>
              </div>
              <p className="text-gray-600">正在自动跳转到登录页面...</p>
            </div>
          )}

          {hasSession && !success && (
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                返回登录页面
              </Link>
            </div>
          )}

          {!hasSession && (
            <div className="mt-6 text-center space-y-2">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                前往登录页面
              </Link>
              <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                返回首页
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}