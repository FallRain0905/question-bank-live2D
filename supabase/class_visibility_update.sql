-- ============================================
-- 班级可见性和审核功能更新
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 1. 为 questions 表添加可见性字段
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'class' CHECK (visibility IN ('class', 'public'));

-- 2. 为 notes 表添加可见性字段
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'class' CHECK (visibility IN ('class', 'public'));

-- 3. 为 class_members 表添加审核状态字段
ALTER TABLE class_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 4. 为 class_members 表添加申请原因字段（可选）
ALTER TABLE class_members
ADD COLUMN IF NOT EXISTS message TEXT;

-- 5. 更新 class_members RLS 策略，支持审核功能
DROP POLICY IF EXISTS "用户可以查看班级成员列表" ON class_members;
DROP POLICY IF EXISTS "班级成员可以查看自己所属班级" ON class_members;
DROP POLICY IF EXISTS "用户可以申请加入班级" ON class_members;
DROP POLICY IF EXISTS "班级管理员可以管理成员" ON class_members;

-- 用户可以查看已批准的班级成员列表（管理员可以查看所有）
CREATE POLICY "用户可以查看班级成员列表"
    ON class_members FOR SELECT
    USING (
        -- 管理员可以看到所有成员
        EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.class_id = class_members.class_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('creator', 'moderator')
        )
        -- 普通用户只能看到已批准的成员
        OR status = 'approved'
        -- 或者只能看到自己的申请
        OR user_id = auth.uid()
    );

-- 班级管理员可以批准/拒绝加入申请
CREATE POLICY "班级管理员可以批准加入申请"
    ON class_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.class_id = class_members.class_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('creator', 'moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.class_id = class_members.class_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('creator', 'moderator')
        )
    );

-- 用户可以申请加入班级
CREATE POLICY "用户可以申请加入班级"
    ON class_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND NOT EXISTS (
            SELECT 1 FROM class_members
            WHERE class_id = class_members.class_id
            AND user_id = auth.uid()
        )
    );

-- 用户可以更新自己的申请（如取消申请）
CREATE POLICY "用户可以更新自己的申请"
    ON class_members FOR UPDATE
    USING (auth.uid() = user_id);

-- 6. 为 questions 表更新 RLS 策略，支持可见性控制
-- 首先获取现有的策略
DROP POLICY IF EXISTS "用户可以查看已通过的题目" ON questions;
DROP POLICY IF EXISTS "用户可以插入题目" ON questions;
DROP POLICY IF EXISTS "用户可以更新自己的题目" ON questions;
DROP POLICY IF EXISTS "用户可以删除自己的题目" ON questions;

-- 用户可以查看题目：
-- - 公开题目所有人可见
-- - 班级题目只有该班级成员可见
-- - 自己的题目总是可见
CREATE POLICY "用户可以查看题目"
    ON questions FOR SELECT
    USING (
        -- 自己的题目总是可见
        user_id = auth.uid()
        -- 公开的已通过题目
        OR (visibility = 'public' AND status = 'approved')
        -- 班级题目：需要是该班级成员
        OR (
            visibility = 'class'
            AND status = 'approved'
            AND EXISTS (
                SELECT 1 FROM class_members cm
                WHERE cm.class_id = questions.class_id
                AND cm.user_id = auth.uid()
                AND cm.status = 'approved'
            )
        )
    );

-- 用户可以插入题目
CREATE POLICY "用户可以插入题目"
    ON questions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的题目（仅当状态为 pending 时）
CREATE POLICY "用户可以更新自己的题目"
    ON questions FOR UPDATE
    USING (
        user_id = auth.uid()
        AND status = 'pending'
    );

-- 用户可以删除自己的题目
CREATE POLICY "用户可以删除自己的题目"
    ON questions FOR DELETE
    USING (user_id = auth.uid());

-- 7. 为 notes 表更新 RLS 策略，支持可见性控制
DROP POLICY IF EXISTS "用户可以查看已通过的笔记" ON notes;
DROP POLICY IF EXISTS "用户可以插入笔记" ON notes;
DROP POLICY IF EXISTS "用户可以更新自己的笔记" ON notes;
DROP POLICY IF EXISTS "用户可以删除自己的笔记" ON notes;

-- 用户可以查看笔记：
-- - 公开笔记所有人可见
-- - 班级笔记只有该班级成员可见
-- - 自己的笔记总是可见
CREATE POLICY "用户可以查看笔记"
    ON notes FOR SELECT
    USING (
        -- 自己的笔记总是可见
        user_id = auth.uid()
        -- 公开的已通过笔记
        OR (visibility = 'public' AND status = 'approved')
        -- 班级笔记：需要是该班级成员
        OR (
            visibility = 'class'
            AND status = 'approved'
            AND EXISTS (
                SELECT 1 FROM class_members cm
                WHERE cm.class_id = notes.class_id
                AND cm.user_id = auth.uid()
                AND cm.status = 'approved'
            )
        )
    );

-- 用户可以插入笔记
CREATE POLICY "用户可以插入笔记"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的笔记（仅当状态为 pending 时）
CREATE POLICY "用户可以更新自己的笔记"
    ON notes FOR UPDATE
    USING (
        user_id = auth.uid()
        AND status = 'pending'
    );

-- 用户可以删除自己的笔记
CREATE POLICY "用户可以删除自己的笔记"
    ON notes FOR DELETE
    USING (user_id = auth.uid());

-- 8. 创建班级申请通知触发器函数
CREATE OR REPLACE FUNCTION notify_class_join_request()
RETURNS TRIGGER AS $$
BEGIN
    -- 发送通知给班级管理员
    INSERT INTO notifications (user_id, type, title, content, link)
    SELECT cm.user_id,
           'class_join',
           '班级加入申请',
           u.username || ' (' || u.email || ') 申请加入您的班级 ' || c.name,
           '/classes'
    FROM class_members new_cm
    INNER JOIN classes c ON c.id = new_cm.class_id
    CROSS JOIN LATERAL (
        SELECT id, username, email
        FROM user_profiles u
        WHERE u.id = c.creator_id
    ) u
    WHERE new_cm.id = NEW.id
      AND new_cm.status = 'pending'
      AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = u.id
          AND n.type = 'class_join'
          AND n.created_at > NOW() - INTERVAL '5 minutes'
      );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建触发器
DROP TRIGGER IF EXISTS on_class_member_inserted ON class_members;
CREATE TRIGGER on_class_member_inserted
    AFTER INSERT ON class_members
    FOR EACH ROW
    EXECUTE FUNCTION notify_class_join_request();

-- 10. 创建通知表状态字段（如果不存在）
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS extra_data JSONB;

-- 11. 为 user_profiles 表添加头像和昵称字段（如果不存在）
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;
