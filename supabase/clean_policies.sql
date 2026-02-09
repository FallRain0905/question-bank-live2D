-- ============================================
-- 清理旧的 RLS 策略并重建
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 删除所有现有策略
DROP POLICY IF EXISTS "创建者可以删除自己的题目" ON questions;
DROP POLICY IF EXISTS "创建者或管理员可以更新题目" ON questions;
DROP POLICY IF EXISTS "所有人都可以查看题目" ON questions;
DROP POLICY IF EXISTS "登录用户可以创建题目" ON questions;
DROP POLICY IF EXISTS "登录用户可以更新题目" ON questions;
DROP POLICY IF EXISTS "登录用户可以查看题目" ON questions;
DROP POLICY IF EXISTS "管理员可以更新题目" ON questions;

-- 创建新策略（不访问 auth.users 表）

-- 所有登录用户都可以查看题目
CREATE POLICY "登录用户可以查看题目"
    ON questions FOR SELECT
    USING (auth.role() = 'authenticated');

-- 所有登录用户都可以创建题目
CREATE POLICY "登录用户可以创建题目"
    ON questions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 所有登录用户都可以更新题目（管理员权限在应用层控制）
CREATE POLICY "登录用户可以更新题目"
    ON questions FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 创建者可以删除自己的题目
CREATE POLICY "创建者可以删除自己的题目"
    ON questions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 设置管理员
-- ============================================

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{is_admin}',
    'true'
)
WHERE email = '3283254551@qq.com';

-- 确保已有的题目都有 status 字段
UPDATE questions SET status = 'approved' WHERE status IS NULL;
