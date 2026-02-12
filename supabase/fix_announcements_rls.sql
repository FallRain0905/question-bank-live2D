-- 修复公告表的 RLS 策略
-- 问题：当前策略检查 user_metadata->>'is_admin' 或硬编码邮箱
-- 解决：简化策略，只检查 auth.uid() IS NOT NULL（已登录用户）

-- 1. 删除旧的复杂策略
DROP POLICY IF EXISTS "只有管理员可以创建公告" ON announcements;
DROP POLICY IF EXISTS "只有管理员可以更新公告" ON announcements;
DROP POLICY IF EXISTS "只有管理员可以删除公告" ON announcements;
DROP POLICY IF EXISTS "所有人可以查看公告" ON announcements;

-- 2. 创建简化的策略 - 已登录用户可以操作公告
CREATE POLICY "已登录用户可以查看公告"
ON announcements FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "已登录用户可以创建公告"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "已登录用户可以更新公告"
ON announcements FOR UPDATE
TO authenticated
WITH CHECK (true);

CREATE POLICY "已登录用户可以删除公告"
ON announcements FOR DELETE
TO authenticated
WITH CHECK (true);

-- 3. 同时修复 announcement_views 表的策略（允许已登录用户插入）
DROP POLICY IF EXISTS "用户可以记录公告阅读" ON announcement_views;
CREATE POLICY "已登录用户可以记录公告阅读"
ON announcement_views FOR INSERT
TO authenticated
WITH CHECK (true);
