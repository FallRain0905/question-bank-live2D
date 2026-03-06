'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import AIPage from '../ai/page';

export default function HomePage() {
  useEffect(() => {
    // 检查用户是否登录，未登录则跳转到登录页
    const checkAuth = async () => {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) {
        window.location.href = '/login';
      }
    };
    checkAuth();
  }, []);

  // 登录用户直接渲染AI助手页面
  return <AIPage />;
}
