'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await getSupabase().auth.getUser();
        
        if (!isMounted.current) return;

        if (!authUser && requireAuth) {
          router.push('/login');
          return;
        }

        if (authUser) {
          const userData: User = {
            id: authUser.id,
            email: authUser.email || '',
            username: authUser.user_metadata?.username,
            displayName: authUser.user_metadata?.display_name,
            avatarUrl: authUser.user_metadata?.avatar_url,
          };
          setUser(userData);
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        if (requireAuth) {
          router.push('/login');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted.current = false;
    };
  }, [router, requireAuth]);

  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  }, [router]);

  return {
    user,
    loading,
    signOut,
    isMounted,
  };
}
