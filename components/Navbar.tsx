'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { UserProfile } from '@/types';
import { getSupabase, clearSupabaseCache } from '@/lib/supabase';
import { themes, getCurrentTheme, setCurrentTheme, initTheme, saveCustomThemeColors, getCustomThemeColors, applyTheme, saveImageTheme, getImageTheme, DEFAULT_CUSTOM_COLORS, type Theme, type CustomThemeColors, type ImageTheme } from '@/lib/theme';

export default function Navbar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClassModerator, setIsClassModerator] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<'discover' | 'create' | 'tools' | 'admin' | 'user' | 'theme' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTheme, setCurrentThemeState] = useState<Theme | ImageTheme>(getCurrentTheme());
  const [customColors, setCustomColors] = useState<CustomThemeColors>(getCustomThemeColors());
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [imageTheme, setImageTheme] = useState<ImageTheme>(getImageTheme());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用 ref 来跟踪组件是否已卸载
  const isMounted = useRef(true);
  // 保存初始化函数的引用，避免重复调用
  const initializeUserData = useRef<((userId: string) => Promise<void>) | null>(null);

  // 关闭下拉菜单的点击外部处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 只有点击在按钮外部且没有打开的下拉菜单时才关闭
      if (
        !target.closest('button') &&
        !target.closest('a') &&
        !target.closest('[role="button"]') &&
        !target.closest('.absolute')
      ) {
        setDropdownOpen(null);
        setShowCustomEditor(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // 初始化主题
    initTheme();

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

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    if (themeId === 'custom') {
      const colors = getCustomThemeColors();
      setCurrentThemeState({ id: 'custom', name: '自定义', colors: colors as Theme['colors'] });
    } else if (themeId === 'image') {
      const imgTheme = getImageTheme();
      setImageTheme(imgTheme);
      setCurrentThemeState(imgTheme);
    } else {
      setCurrentThemeState(themes[themeId]);
    }
    setShowCustomEditor(false);
  };

  const handleCustomColorChange = (level: string, value: string) => {
    const newColors = { ...customColors, [level]: value };
    setCustomColors(newColors);
    saveCustomThemeColors(newColors);
    applyTheme('custom');
    setCurrentThemeState({ id: 'custom', name: '自定义', colors: newColors as Theme['colors'] });
  };

  // 从图片提取颜色
  const extractColorsFromImage = (imageDataUrl: string): Promise<Record<string, string>> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        // 获取图片中心区域的像素进行颜色分析
        const sampleSize = 100;
        const startX = Math.max(0, (canvas.width - sampleSize) / 2);
        const startY = Math.max(0, (canvas.height - sampleSize) / 2);
        const imageData = ctx?.getImageData(startX, startY, Math.min(sampleSize, canvas.width), Math.min(sampleSize, canvas.height));

        if (!imageData) {
          resolve(DEFAULT_CUSTOM_COLORS as Record<string, string>);
          return;
        }

        const pixels = imageData.data;
        const colors: number[][] = [];

        // 采样像素颜色
        for (let i = 0; i < pixels.length; i += 20) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness > 20 && brightness < 235) {
            colors.push([r, g, b]);
          }
        }

        // K-means聚类找出主要颜色
        const k = 3;
        let centroids: number[][] = [];

        // 初始化聚类中心
        for (let i = 0; i < k; i++) {
          const idx = Math.floor(colors.length * i / k);
          centroids.push(colors[idx] || [100, 100, 100]);
        }

        for (let iter = 0; iter < 10; iter++) {
          const clusters: number[][][] = [[], [], []];

          for (const color of colors) {
            let minDist = Infinity;
            let clusterIdx = 0;
            for (let i = 0; i < k; i++) {
              const dist = Math.sqrt(
                Math.pow(color[0] - centroids[i][0], 2) +
                Math.pow(color[1] - centroids[i][1], 2) +
                Math.pow(color[2] - centroids[i][2], 2)
              );
              if (dist < minDist) {
                minDist = dist;
                clusterIdx = i;
              }
            }
            clusters[clusterIdx].push(color);
          }

          for (let i = 0; i < k; i++) {
            if (clusters[i].length > 0) {
              centroids[i] = [
                Math.round(clusters[i].reduce((sum, c) => sum + c[0], 0) / clusters[i].length),
                Math.round(clusters[i].reduce((sum, c) => sum + c[1], 0) / clusters[i].length),
                Math.round(clusters[i].reduce((sum, c) => sum + c[2], 0) / clusters[i].length)
              ];
            }
          }
        }

        // 排序聚类中心，从亮到暗
        centroids.sort((a, b) => {
          const brightnessA = (a[0] * 299 + a[1] * 587 + a[2] * 114) / 1000;
          const brightnessB = (b[0] * 299 + b[1] * 587 + b[2] * 114) / 1000;
          return brightnessB - brightnessA;
        });

        // 生成色板
        const rgbToHex = (r: number, g: number, b: number): string => {
          return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        };

        const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 0, g: 0, b: 0 };
        };

        const adjustBrightness = (hex: string, factor: number): string => {
          const { r, g, b } = hexToRgb(hex);
          const adjust = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
          return rgbToHex(adjust(r), adjust(g), adjust(b));
        };

        const mixColors = (hex1: string, hex2: string, ratio: number): string => {
          const c1 = hexToRgb(hex1);
          const c2 = hexToRgb(hex2);
          const mix = (v1: number, v2: number) => Math.round(v1 * (1 - ratio) + v2 * ratio);
          return rgbToHex(mix(c1.r, c2.r), mix(c1.g, c2.g), mix(c1.b, c2.b));
        };

        // 使用提取的颜色生成完整色板
        const light = rgbToHex(centroids[0][0], centroids[0][1], centroids[0][2]);
        const mid = centroids[1] ? rgbToHex(centroids[1][0], centroids[1][1], centroids[1][2]) : light;
        const dark = centroids[2] ? rgbToHex(centroids[2][0], centroids[2][1], centroids[2][2]) : mid;

        resolve({
          50: adjustBrightness(light, 1.8),
          100: adjustBrightness(light, 1.5),
          200: adjustBrightness(light, 1.2),
          300: adjustBrightness(light, 1.0),
          400: mixColors(light, mid, 0.7),
          500: mid,
          600: mixColors(mid, dark, 0.3),
          700: mixColors(mid, dark, 0.6),
          800: mixColors(mid, dark, 0.8),
          900: adjustBrightness(dark, 0.7),
          950: adjustBrightness(dark, 0.4),
        });
      };

      img.onerror = () => {
        resolve(DEFAULT_CUSTOM_COLORS as Record<string, string>);
      };

      img.src = imageDataUrl;
    });
  };

  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件大小（限制5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    // 检查文件类型
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      alert('只支持 JPG、PNG、WebP 格式的图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;

      // 提取颜色
      const colors = await extractColorsFromImage(imageDataUrl);

      // 创建图片主题
      const newImageTheme: ImageTheme = {
        id: 'image',
        name: '图片主题',
        imageUrl: imageDataUrl,
        colors: colors as Theme['colors'],
      };

      // 保存图片主题
      setImageTheme(newImageTheme);
      saveImageTheme(newImageTheme);

      // 应用主题
      setCurrentTheme('image');
      setCurrentThemeState(newImageTheme);
    };
    reader.readAsDataURL(file);
  };

  // 删除图片主题
  const handleRemoveImageTheme = () => {
    const defaultImageTheme: ImageTheme = {
      id: 'image',
      name: '图片主题',
      imageUrl: '',
      colors: customColors as Theme['colors'],
    };
    setImageTheme(defaultImageTheme);
    saveImageTheme(defaultImageTheme);
    if (currentTheme.id === 'image') {
      setCurrentTheme('a');
      setCurrentThemeState(themes['a']);
    }
  };

  return (
    <nav className="bg-brand-950/80 backdrop-blur-md border-b border-brand-800 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 font-bold text-sm group-hover:scale-105 transition-transform">
              学
            </div>
            <span className="text-lg font-bold text-brand-100">
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
                      ...(user.is_admin ? [{ href: '/admin/classes', label: '🎓 班级审核', description: '审核班级创建申请' }] : []),
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
            {/* 主题选择器 */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(dropdownOpen === 'theme' ? null : 'theme')}
                className="p-2 text-brand-400 hover:text-brand-200 hover:bg-brand-800 rounded-lg transition-all"
                title="切换主题"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828-2.828l5.656 5.657a2 2 0 010 2.828l-1.657 1.657a2 2 0 01-2.828 0l-5.656-5.657a2 2 0 010-2.828z" />
                </svg>
              </button>
              {dropdownOpen === 'theme' && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-brand-800 rounded-xl border border-brand-700 shadow-lg py-2 z-50">
                  <div className="px-4 py-2 text-xs text-brand-500 font-medium">选择配色主题</div>

                  {/* 自定义主题选项 */}
                  <button
                    onClick={() => {
                      setShowCustomEditor(!showCustomEditor);
                      setCurrentTheme('custom');
                      setCurrentThemeState({ id: 'custom', name: '自定义', colors: customColors as Theme['colors'] });
                    }}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      currentTheme.id === 'custom'
                        ? 'bg-brand-700 text-brand-100'
                        : 'text-brand-300 hover:bg-brand-700 hover:text-brand-100'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{
                        background: `linear-gradient(135deg, ${customColors[300]}, ${customColors[500]})`,
                      }}
                    />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">自定义配色</div>
                      <div className="flex gap-1 mt-1">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customColors[400] }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customColors[500] }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customColors[600] }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customColors[700] }} />
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${showCustomEditor ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 自定义配色编辑器 */}
                  {showCustomEditor && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-4 pb-4 pt-2 border-t border-brand-700"
                    >
                      <div className="grid grid-cols-5 gap-2">
                        {(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const).map((level) => (
                          <div key={level}>
                            <label className="text-xs text-brand-500 mb-1 block">{level}</label>
                            <input
                              type="color"
                              value={customColors[level] || DEFAULT_CUSTOM_COLORS[level]}
                              onChange={(e) => handleCustomColorChange(level, e.target.value)}
                              className="w-full h-8 rounded cursor-pointer bg-brand-900 border border-brand-700"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          // 重置为默认配色
                          const defaultColors: CustomThemeColors = {
                            50: '#F0F9FF',
                            100: '#E0F2FE',
                            200: '#BAE6FD',
                            300: '#7DD3FC',
                            400: '#38BDF8',
                            500: '#0EA5E9',
                            600: '#0284C7',
                            700: '#0369A1',
                            800: '#075985',
                            900: '#0C4A6E',
                            950: '#082F49',
                          };
                          setCustomColors(defaultColors);
                          saveCustomThemeColors(defaultColors);
                          applyTheme('custom');
                          setCurrentThemeState({ id: 'custom', name: '自定义', colors: defaultColors as Theme['colors'] });
                        }}
                        className="mt-3 w-full py-2 text-xs text-brand-500 hover:text-brand-300 transition-colors"
                      >
                        重置为默认
                      </button>
                    </motion.div>
                  )}

                  {/* 图片主题 */}
                  <div className="px-4 py-2 text-xs text-brand-600 font-medium border-t border-brand-700">图片主题</div>
                  {imageTheme.imageUrl ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCurrentTheme('image');
                          setCurrentThemeState(imageTheme);
                        }}
                        className={`flex-1 px-4 py-2.5 flex items-center gap-3 transition-colors ${
                          currentTheme.id === 'image'
                            ? 'bg-brand-700 text-brand-100'
                            : 'text-brand-300 hover:bg-brand-700 hover:text-brand-100'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg bg-cover bg-center relative overflow-hidden"
                          style={{ backgroundImage: `url(${imageTheme.imageUrl})` }}
                        >
                          <div className="absolute inset-0 bg-black/20" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">自定义背景</div>
                          <div className="flex gap-1 mt-1">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: imageTheme.colors[400] }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: imageTheme.colors[500] }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: imageTheme.colors[600] }} />
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: imageTheme.colors[700] }} />
                          </div>
                        </div>
                        {currentTheme.id === 'image' && (
                          <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-5.58-5.59L16.41 17l1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={handleRemoveImageTheme}
                        className="px-2.5 py-2.5 text-brand-500 hover:text-red-400 hover:bg-brand-700 transition-colors"
                        title="移除背景"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-3 flex items-center gap-3 text-brand-300 hover:bg-brand-700 hover:text-brand-100 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-900 border-2 border-dashed border-brand-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">上传图片作为背景</div>
                        <div className="text-xs text-brand-500">自动生成配色方案</div>
                      </div>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* 预设主题 */}
                  <div className="px-4 py-2 text-xs text-brand-600 font-medium border-t border-brand-700 mt-2">预设主题</div>
                  {Object.values(themes).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        currentTheme.id === theme.id
                          ? 'bg-brand-700 text-brand-100'
                          : 'text-brand-300 hover:bg-brand-700 hover:text-brand-100'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors[300]}, ${theme.colors[500]})`,
                        }}
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{theme.name}</div>
                        <div className="flex gap-1 mt-1">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.colors[400] }}
                          />
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.colors[500] }}
                          />
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.colors[600] }}
                          />
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: theme.colors[700] }}
                          />
                        </div>
                      </div>
                      {currentTheme.id === theme.id && (
                        <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-5.58-5.59L16.41 17l1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <>
                {/* 通知图标 */}
                <Link
                  href="/notifications"
                  className="p-2.5 text-brand-400 hover:text-brand-200 hover:bg-brand-800 rounded-lg transition-all relative"
                  title="通知"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-500 text-brand-50 text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-brand-800 shadow-lg">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* 用户菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === 'user' ? null : 'user')}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-brand-800 rounded-lg transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-brand-50 text-sm font-medium">
                      {user.username?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-brand-200">
                      {user.username || '我的'}
                    </span>
                    <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen === 'user' && (
                    <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] bg-brand-800 rounded-xl border border-brand-700 shadow-lg py-1 z-50">
                      <Link
                        href="/me"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-200 hover:bg-brand-700 transition-colors"
                        onClick={() => setDropdownOpen(null)}
                      >
                        <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        个人中心
                      </Link>
                      <Link
                        href="/me?tab=favorites"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-200 hover:bg-brand-700 transition-colors"
                        onClick={() => setDropdownOpen(null)}
                      >
                        <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        我的收藏
                      </Link>
                      <hr className="my-1 border-brand-700" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-300 hover:bg-brand-700 hover:text-red-400 transition-colors"
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
                className="px-5 py-2 bg-brand-500 text-brand-50 text-sm font-medium rounded-full hover:bg-brand-400 transition-all hover:shadow-glow"
              >
                登录 / 注册
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-brand-400 hover:bg-brand-800 rounded-lg"
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
            className="md:hidden py-4 border-t border-brand-800"
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
                      <MobileLink href="/admin/classes" onClick={() => setMobileMenuOpen(false)}>🎓 班级审核</MobileLink>
                      <MobileLink href="/admin/announcements" onClick={() => setMobileMenuOpen(false)}>📢 公告管理</MobileLink>
                      <MobileLink href="/admin/tags" onClick={() => setMobileMenuOpen(false)}>🏷️ 标签管理</MobileLink>
                    </>
                  )}
                  <hr className="my-2 border-brand-800" />
                  <MobileLink href="/me" onClick={() => setMobileMenuOpen(false)}>👤 个人中心</MobileLink>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-brand-300 hover:bg-brand-800 hover:text-red-400 transition-colors rounded-lg"
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
            ? 'bg-brand-700 text-brand-50'
            : 'text-brand-300 hover:bg-brand-800 hover:text-brand-100'
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
          className="absolute top-full left-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-brand-800 rounded-xl border border-brand-700 py-1.5 z-50"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onToggle}
              className="flex flex-col px-4 py-2.5 text-sm text-brand-200 hover:bg-brand-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span>{item.label}</span>
              <span className="text-xs text-brand-500 mt-0.5">{item.description}</span>
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
      className="block px-4 py-3 text-sm text-brand-200 hover:bg-brand-800 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}
