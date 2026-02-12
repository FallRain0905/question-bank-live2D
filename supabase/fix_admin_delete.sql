-- ============================================
-- 修复管理员删除问题
-- 让管理员可以删除任何题目和笔记
-- ============================================

-- 1. 修复 questions 表的 RLS 策略
-- ============================================

-- 删除旧的删除策略
DROP POLICY IF EXISTS "只有创建者可以删除题目" ON questions;

-- 创建新的删除策略：管理员或创建者可以删除
CREATE POLICY "管理员或创建者可以删除题目"
    ON questions FOR DELETE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

-- 添加管理员更新策略（如果不存在）
DROP POLICY IF EXISTS "管理员或创建者可以更新题目" ON questions;
CREATE POLICY "管理员或创建者可以更新题目"
    ON questions FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

-- 2. 修复 notes 表的 RLS 策略
-- ============================================

-- 删除旧的删除策略（如果存在）
DROP POLICY IF EXISTS "只有创建者可以删除笔记" ON notes;

-- 创建新的删除策略：管理员或创建者可以删除
CREATE POLICY "管理员或创建者可以删除笔记"
    ON notes FOR DELETE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    );

-- 添加管理员更新策略（如果不存在）
DROP POLICY IF EXISTS "管理员或创建者可以更新笔记" ON notes;
CREATE POLICY "管理员或创建者可以更新笔记"
    ON notes FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'is_admin')::boolean = true
        )
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
WHERE tablename = 'questions'
ORDER BY policyname;

-- 查看 notes 表的最终策略
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'notes'
ORDER BY policyname;
