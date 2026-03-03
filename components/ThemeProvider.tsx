'use client';

import { useEffect } from 'react';
import { initTheme } from '@/lib/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化主题
    initTheme();
  }, []);

  return <>{children}</>;
}
