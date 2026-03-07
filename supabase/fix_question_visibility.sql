-- ============================================
-- 修复题目和笔记可见性问题
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 1. 添加 visibility 列到 questions 表
ALTER TABLE questions ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'class'));

-- 2. 添加 status 列到 questions 表
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. 添加 favorites_count 列（如果不存在）
ALTER TABLE questions ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;

-- 4. 添加 visibility 列到 notes 表
ALTER TABLE notes ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'class'));

-- 5. 添加 status 列到 notes 表
ALTER TABLE notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 6. 添加 favorites_count 列（如果不存在）
ALTER TABLE notes ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;

-- ============================================
-- 删除所有现有的 RLS 策略
-- 使用 DO 块来删除所有策略，避免重复策略错误
-- ============================================

DO $$
DECLARE
    policy_name text;
BEGIN
    -- 删除 questions 表的所有策略
    FOR policy_name IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'questions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON questions', policy_name);
    END LOOP;

    -- 删除 notes 表的所有策略
    FOR policy_name IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON notes', policy_name);
    END LOOP;
END $$;

-- ============================================
-- 重新创建 RLS 策略
-- ============================================

-- 题目表的策略

-- 公开题目且已审核 - 所有人都可以查看
CREATE POLICY "公开题目且已审核所有人都可以查看"
    ON questions FOR SELECT
    USING (visibility = 'public' AND status = 'approved');

-- 班级题目 - 只有班级成员可以查看
CREATE POLICY "班级题目班级成员可以查看"
    ON questions FOR SELECT
    USING (
        visibility = 'class' AND
        auth.uid() IN (
            SELECT user_id
            FROM class_members
            WHERE class_id = questions.class_id AND status = 'approved'
        )
    );

-- 题目创建者可以查看自己的所有题目
CREATE POLICY "创建者可以查看自己的题目"
    ON questions FOR SELECT
    USING (auth.uid() = user_id);

-- 任何认证用户都可以创建题目
CREATE POLICY "任何认证用户都可以创建题目"
    ON questions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 只有创建者可以删除题目
CREATE POLICY "只有创建者可以删除题目"
    ON questions FOR DELETE
    USING (auth.uid() = user_id);

-- 只有创建者可以更新题目
CREATE POLICY "创建者可以更新自己的题目"
    ON questions FOR UPDATE
    USING (auth.uid() = user_id);

-- 笔记表的策略

-- 公开笔记且已审核 - 所有人都可以查看
CREATE POLICY "公开笔记且已审核所有人都可以查看"
    ON notes FOR SELECT
    USING (visibility = 'public' AND status = 'approved');

-- 班级笔记 - 只有班级成员可以查看
CREATE POLICY "班级笔记班级成员可以查看"
    ON notes FOR SELECT
    USING (
        visibility = 'class' AND
        auth.uid() IN (
            SELECT user_id
            FROM class_members
            WHERE class_id = notes.class_id AND status = 'approved'
        )
    );

-- 笔记创建者可以查看自己的所有笔记
CREATE POLICY "创建者可以查看自己的笔记"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

-- 任何认证用户都可以创建笔记
CREATE POLICY "任何认证用户都可以创建笔记"
    ON notes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 只有创建者可以删除笔记
CREATE POLICY "只有创建者可以删除笔记"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- 只有创建者可以更新笔记
CREATE POLICY "创建者可以更新自己的笔记"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);
