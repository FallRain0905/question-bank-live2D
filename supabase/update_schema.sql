-- ============================================
-- 审核功能 - 数据库表结构更新
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 1. 给 questions 表添加 status 字段（审核状态）
-- 先检查列是否已存在，如果不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'status'
    ) THEN
        ALTER TABLE questions ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 更新已有的题目为已审核状态（如果需要）
-- UPDATE questions SET status = 'approved' WHERE status IS NULL;

-- ============================================
-- 更新行级安全策略 (RLS)
-- ============================================

-- 修改题目表的策略：只显示已审核的题目
DROP POLICY IF EXISTS "任何人都可以查看题目" ON questions;
CREATE POLICY "任何人都可以查看已审核的题目"
    ON questions FOR SELECT
    USING (auth.role() = 'authenticated' AND status = 'approved');

-- 管理员可以查看所有题目
CREATE POLICY "管理员可以查看所有题目"
    ON questions FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND (
            status = 'approved'
            OR EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
            )
        )
    );

-- 只有创建者可以删除自己的题目
DROP POLICY IF EXISTS "只有创建者可以删除题目" ON questions;
CREATE POLICY "只有创建者可以删除题目"
    ON questions FOR DELETE
    USING (auth.uid() = user_id);

-- 任何登录用户可以插入题目
DROP POLICY IF EXISTS "登录用户可以创建题目" ON questions;
CREATE POLICY "登录用户可以创建题目"
    ON questions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 管理员可以更新题目状态
CREATE POLICY "管理员可以更新题目"
    ON questions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
        )
    );

-- ============================================
-- 说明
-- ============================================
-- status 字段值说明：
-- - pending: 等待审核
-- - approved: 已通过审核
-- - rejected: 已拒绝
