-- ============================================
-- 修复版本 v3 - 解决 WITH CHECK 错误
-- ============================================

-- 第 1 部分：修复 user_profiles 表的 RLS
-- ============================================

-- 删除所有可能冲突的旧策略
DROP POLICY IF EXISTS "所有人可以查看用户信息" ON public.user_profiles;
DROP POLICY IF EXISTS "用户可以编辑自己的信息" ON public.user_profiles;
DROP POLICY IF EXISTS "用户可以插入自己的信息" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles can be accessed by service role" ON public.user_profiles;
DROP POLICY IF EXISTS "允许查看用户资料" ON public.user_profiles;
DROP POLICY IF EXISTS "允许编辑用户资料" ON public.user_profiles;
DROP POLICY IF EXISTS "允许插入用户资料" ON public.user_profiles;
DROP POLICY IF EXISTS "已认证用户可以查看个人资料" ON public.user_profiles;

-- 创建新的简单策略
CREATE POLICY "已登录用户可以查看用户资料"
ON public.user_profiles FOR SELECT
TO public.user_profiles FOR ALL
USING (true);

CREATE POLICY "已登录用户可以插入用户资料"
ON public.user_profiles FOR INSERT
TO public.user_profiles FOR ALL
WITH CHECK (true);

CREATE POLICY "已登录用户可以更新用户资料"
ON public.user_profiles FOR UPDATE
TO public.user_profiles FOR ALL
WITH CHECK (true);

-- Service role 可以执行任何操作
CREATE POLICY "Service role 完全访问"
ON public.user_profiles FOR ALL
TO service_role
WITH CHECK (true);

-- ============================================
-- 第 2 部分：修复 announcements 表的 RLS
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "已登录用户可以查看公告" ON announcements;
DROP POLICY IF EXISTS "已登录用户可以创建公告" ON announcements;
DROP POLICY IF EXISTS "已登录用户可以更新公告" ON announcements;
DROP POLICY IF EXISTS "已登录用户可以删除公告" ON announcements;

-- 创建新的策略 - 移除 WITH CHECK 限制
CREATE POLICY "已登录用户可以查看公告"
ON announcements FOR SELECT
TO public.announcements FOR ALL
USING (true);

CREATE POLICY "已登录用户可以创建公告"
ON announcements FOR INSERT
TO public.announcements FOR ALL
WITH CHECK (true);

CREATE POLICY "已登录用户可以更新公告"
ON announcements FOR UPDATE
TO public.announcements FOR ALL
WITH CHECK (true);

CREATE POLICY "已登录用户可以删除公告"
ON announcements FOR DELETE
TO public.announcements FOR ALL
WITH CHECK (true);

-- ============================================
-- 第 3 部分：修复 announcement_views 表的 RLS
-- ============================================

DROP POLICY IF EXISTS "已登录用户可以记录公告阅读" ON announcement_views;
DROP POLICY IF EXISTS "所有人可以查看阅读记录" ON announcement_views;

-- 创建新策略
CREATE POLICY "已登录用户可以记录公告阅读"
ON announcement_views FOR INSERT
TO public.announcement_views FOR ALL
WITH CHECK (true);

CREATE POLICY "所有人可以查看阅读记录"
ON announcement_views FOR SELECT
TO public.announcement_views FOR ALL
USING (true);

-- ============================================
-- 第 4 部分：验证
-- ============================================

-- 查看 user_profiles 表的最终策略
SELECT
    schemaname || 'public' as schema_name,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 查看 announcements 表的策略
SELECT
    schemaname || 'public' as schema_name,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'announcements';

-- ============================================
-- 完成
-- ============================================
-- 执行此脚本后，刷新页面并尝试创建公告
