-- ============================================
-- 修复管理员删除问题 v2
-- 使用 user_metadata 检查而不是查询 auth.users 表
-- ============================================

-- 1. 修复 questions 表的 RLS 策略
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "只有创建者可以删除题目" ON questions;
DROP POLICY IF EXISTS "管理员或创建者可以删除题目" ON questions;
DROP POLICY IF EXISTS "管理员或创建者可以更新题目" ON questions;

-- 创建新的删除策略：管理员或创建者可以删除
CREATE POLICY "管理员或创建者可以删除题目"
    ON questions FOR DELETE
    USING (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    );

-- 添加管理员更新策略
CREATE POLICY "管理员或创建者可以更新题目"
    ON questions FOR UPDATE
    USING (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    );

-- 2. 修复 notes 表的 RLS 策略
-- ============================================

-- 删除旧的策略
DROP POLICY IF EXISTS "只有创建者可以删除笔记" ON notes;
DROP POLICY IF EXISTS "管理员或创建者可以删除笔记" ON notes;
DROP POLICY IF EXISTS "管理员或创建者可以更新笔记" ON notes;

-- 创建新的删除策略：管理员或创建者可以删除
CREATE POLICY "管理员或创建者可以删除笔记"
    ON notes FOR DELETE
    USING (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    );

-- 添加管理员更新策略
CREATE POLICY "管理员或创建者可以更新笔记"
    ON notes FOR UPDATE
    USING (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    )
    WITH CHECK (
        auth.uid() = user_id
        OR (auth.jwt()->>'user_metadata')::jsonb->>'is_admin' = 'true'
    );

-- ============================================
-- 验证策略
-- ============================================

-- 查看 questions 表的最终策略
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('questions', 'notes')
ORDER BY tablename, cmd, policyname;
