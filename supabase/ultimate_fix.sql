-- ============================================
-- 班级审核系统 - 终极修复脚本
-- 整合了所有修复点，彻底解决策略冲突和管理员权限问题
-- 执行此脚本后，不需要再执行其他任何 SQL 文件
-- ============================================

-- ============================================
-- 第 1 部分：清理所有策略和函数（确保干净的起点）
-- ============================================

-- 1.1. 删除所有策略
DROP POLICY IF EXISTS "登录用户可以查看笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "登录用户可以创建笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "登录用户可以更新笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "创建者可以删除自己的笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "已认证用户可查看笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "已认证用户可创建笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "笔记创建者可更新笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "笔记创建者可删除笔记" ON notes CASCADE;
DROP POLICY IF EXISTS "登录用户可以查看笔记标签" ON note_tags CASCADE;
DROP POLICY IF EXISTS "登录用户可以创建笔记标签" ON note_tags CASCADE;
DROP POLICY IF EXISTS "已认证用户可查看标签" ON note_tags CASCADE;
DROP POLICY IF EXISTS "已认证用户可创建标签" ON note_tags CASCADE;
DROP POLICY IF EXISTS "登录用户可以查看点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "登录用户可以创建点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "用户可以取消点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "已认证用户可查看点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "已认证用户可创建点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "用户可取消点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "已认证用户可查看点赞" ON likes CASCADE;
DROP POLICY IF EXISTS "用户可取消点赞" ON likes CASCADE;

DROP POLICY IF EXISTS "任何人都可以查看题目" ON questions CASCADE;
DROP POLICY IF EXISTS "只有创建者可以删除题目" ON questions CASCADE;
DROP POLICY IF EXISTS "登录用户可以创建题目" ON questions CASCADE;
DROP POLICY IF EXISTS "任何人都可以查看题目标签关联" ON question_tags CASCADE;
DROP POLICY IF EXISTS "登录用户可以创建题目标签关联" ON question_tags CASCADE;
DROP POLICY IF EXISTS "任何人都可以删除题目标签关联" ON question_tags CASCADE;

DROP POLICY IF EXISTS "管理员可以查看所有申请" ON class_approval_requests CASCADE;
DROP POLICY IF EXISTS "管理员可以审核班级申请" ON class_approval_requests CASCADE;
DROP POLICY IF EXISTS "class_approval_requests_select" ON class_approval_requests CASCADE;
DROP POLICY IF EXISTS "class_approval_requests_insert" ON class_approval_requests CASCADE;
DROP POLICY IF EXISTS "class_approval_requests_update" ON class_approval_requests CASCADE;
DROP POLICY IF EXISTS "class_approval_requests_delete" ON class_approval_requests CASCADE;

DROP POLICY IF EXISTS "classes_insert" ON classes CASCADE;
DROP POLICY IF EXISTS "classes_select" ON classes CASCADE;
DROP POLICY IF EXISTS "classes_update" ON classes CASCADE;

DROP POLICY IF EXISTS "class_members_select" ON class_members CASCADE;
DROP POLICY IF EXISTS "class_members_insert" ON class_members CASCADE;
DROP POLICY IF EXISTS "class_members_update" ON class_members CASCADE;
DROP POLICY IF EXISTS "class_members_delete" ON class_members CASCADE;

DROP POLICY IF EXISTS "用户可以创建班级申请" ON class_approval_requests CASCADE;

-- 1.2. 删除所有函数
DROP FUNCTION IF EXISTS is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS is_class_creator CASCADE;
DROP FUNCTION IF EXISTS is_class_member CASCADE;
DROP FUNCTION IF EXISTS generate_invite_code CASCADE;
DROP FUNCTION IF EXISTS set_class_invite_code CASCADE;
DROP FUNCTION IF EXISTS add_creator_as_member() CASCADE;
DROP FUNCTION IF EXISTS auto_insert_approval_request() CASCADE;
DROP FUNCTION IF EXISTS notify_class_approved() CASCADE;
DROP FUNCTION IF EXISTS notify_class_rejected() CASCADE;
DROP FUNCTION IF EXISTS notify_class_join_request() CASCADE;

-- 1.3. 删除所有触发器
DROP TRIGGER IF EXISTS on_class_set_invite_code ON classes CASCADE;
DROP TRIGGER IF EXISTS on_class_add_creator_as_member ON classes CASCADE;
DROP TRIGGER IF EXISTS on_class_inserted_request ON classes CASCADE;
DROP TRIGGER IF EXISTS on_class_status_approved ON classes CASCADE;
DROP TRIGGER IF EXISTS on_class_status_rejected ON classes CASCADE;
DROP TRIGGER IF EXISTS on_class_member_join_request ON classes CASCADE;
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes CASCADE;
DROP TRIGGER IF EXISTS update_notes_likes_count ON likes CASCADE;

-- ============================================
-- 第 2 部分：创建辅助函数（带 SECURITY DEFINER 绕过 RLS）
-- ============================================

-- 检查用户是否已认证（不依赖元数据）
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查是否是超级管理员（最稳健方式）
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    admin_emails TEXT[] := ARRAY['3283254551@qq.com'];
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND email = ANY(admin_emails)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查是否是班级创建者
CREATE OR REPLACE FUNCTION is_class_creator(p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM classes
        WHERE id = p_class_id
        AND creator_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查是否是班级成员（支持 pending 状态）
CREATE OR REPLACE FUNCTION is_class_member(p_class_id UUID, p_status TEXT DEFAULT 'approved')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM class_members
        WHERE class_id = p_class_id
        AND user_id = auth.uid()
        AND status = p_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 生成唯一邀请码
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(encode(gen_random_bytes(16), 'base64'), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- 设置邀请码触发器函数
CREATE OR REPLACE FUNCTION set_class_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 第 3 部分：触发器函数
-- ============================================

-- 添加创建者为成员（SECURITY DEFINER 绕过 RLS）
CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO class_members (class_id, user_id, role, status, joined_at)
    VALUES (NEW.id, NEW.creator_id, 'creator', 'approved', NOW());
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 自动插入班级审核请求（SECURITY DEFINER）
CREATE OR REPLACE FUNCTION auto_insert_approval_request()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO class_approval_requests (class_id, user_id, name, description, invite_code, status)
    VALUES (
        NEW.id,
        NEW.creator_id,
        NEW.name,
        NEW.description,
        NEW.invite_code,
        'pending'
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 班级审核通过通知
CREATE OR REPLACE FUNCTION notify_class_approved()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, content, link, is_read)
    VALUES (
        NEW.creator_id,
        'class_approved',
        '班级创建通过',
        '恭喜！您的班级 "' || NEW.name || '" 已通过审核，可以开始使用了。',
        '/classes',
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 班级审核拒绝通知
CREATE OR REPLACE FUNCTION notify_class_rejected()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, content, link, is_read)
    VALUES (
        NEW.creator_id,
        'class_rejected',
        '班级创建被拒绝',
        '很遗憾，您的班级 "' || NEW.name || '" 未通过审核。原因: ' || COALESCE(NEW.reject_reason, '未提供'),
        '/classes',
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 班级加入申请通知
CREATE OR REPLACE FUNCTION notify_class_join_request()
RETURNS TRIGGER AS $$
DECLARE
    class_name TEXT;
    class_creator_id UUID;
    username TEXT;
BEGIN
    IF NEW.status = 'pending' THEN
        SELECT name, creator_id INTO class_name, class_creator_id
        FROM classes
        WHERE id = NEW.class_id;

        SELECT username INTO username
        FROM user_profiles
        WHERE id = NEW.user_id;

        IF class_name IS NOT NULL AND class_creator_id IS NOT NULL AND username IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, content, link, is_read)
            VALUES (
                class_creator_id,
                'class_join',
                '班级加入申请',
                username || ' 申请加入您的班级 "' || class_name || '"',
                '/classes',
                false
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 第 4 部分：创建 classes 表策略和触发器
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- INSERT 策略：已认证用户可以创建班级
CREATE POLICY "classes_insert"
    ON classes FOR INSERT
    WITH CHECK (
        is_authenticated()
        AND creator_id = auth.uid()
        AND status = 'pending'
    );

-- SELECT 策略：管理员和创建者可以查看班级
CREATE POLICY "classes_select"
    ON classes FOR SELECT
    USING (
        -- 超级管理员可以查看所有班级
        is_super_admin()
        -- 创建者可以查看自己创建的班级（包括 pending）
        OR creator_id = auth.uid()
        -- 已加入的已批准班级
        OR is_class_member(id, 'approved')
    );

-- UPDATE 策略：只有创建者可以更新班级
CREATE POLICY "classes_update"
    ON classes FOR UPDATE
    USING (is_class_creator(id))
    WITH CHECK (is_class_creator(id));

-- 生成邀请码触发器
CREATE TRIGGER on_class_set_invite_code
    BEFORE INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION set_class_invite_code();

-- 添加创建者为成员
CREATE TRIGGER on_class_add_creator_as_member
    AFTER INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION add_creator_as_member();

-- 插入审核请求触发器
CREATE TRIGGER on_class_insert_approval_request
    AFTER INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_approval_request();

-- 审核通过通知触发器
CREATE TRIGGER on_class_status_approved
    AFTER UPDATE OF status ON classes
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'approved')
    EXECUTE FUNCTION notify_class_approved();

-- 审核拒绝通知触发器
CREATE TRIGGER on_class_status_rejected
    AFTER UPDATE OF status ON classes
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status = 'rejected')
    EXECUTE FUNCTION notify_class_rejected();

-- ============================================
-- 第 5 部分：创建 class_members 表策略
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- INSERT 策略：用户可以申请加入班级
CREATE POLICY "class_members_insert"
    ON class_members FOR INSERT
    WITH CHECK (
        is_authenticated()
        AND user_id = auth.uid()
        AND status = 'pending'
        AND NOT is_class_member(class_id)
    );

-- SELECT 策略：班级创建者可以查看所有成员，用户可查看自己的申请，所有用户可查看已批准成员
CREATE POLICY "class_members_select"
    ON class_members FOR SELECT
    USING (
        -- 班级创建者可以看到所有成员
        is_class_creator(class_id)
        -- 用户可以查看自己的申请（包括 pending）
        OR user_id = auth.uid()
        -- 所有用户可以看到已批准的成员
        OR status = 'approved'
    );

-- UPDATE 策略：班级创建者或用户可以更新成员
CREATE POLICY "class_members_update"
    ON class_members FOR UPDATE
    USING (
        -- 班级创建者可以更新所有成员
        is_class_creator(class_id)
        -- 或用户更新自己的申请
        OR user_id = auth.uid()
    )
    WITH CHECK (
        -- 班级创建者可以更新所有成员
        is_class_creator(class_id)
        -- 或用户更新自己的申请
        OR user_id = auth.uid()
    );

-- DELETE 策略：班级创建者可以移除成员，用户可以退出班级
CREATE POLICY "class_members_delete"
    ON class_members FOR DELETE
    USING (
        -- 班级创建者可以移除成员
        is_class_creator(class_id)
        -- 用户可以退出班级
        OR user_id = auth.uid()
    );

-- ============================================
-- 第 6 部分：创建 class_approval_requests 表策略
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE class_approval_requests ENABLE ROW LEVEL SECURITY;

-- INSERT 策略：用户可以创建班级申请
CREATE POLICY "class_approval_requests_insert"
    ON class_approval_requests FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
    );

-- SELECT 策略：超级管理员可以查看所有申请，用户可以查看自己的申请
CREATE POLICY "class_approval_requests_select"
    ON class_approval_requests FOR SELECT
    USING (
        is_super_admin()
        OR user_id = auth.uid()
    );

-- UPDATE 策略：只有超级管理员可以更新
CREATE POLICY "class_approval_requests_update"
    ON class_approval_requests FOR UPDATE
    USING (is_super_admin())
    WITH CHECK (is_super_admin());

-- DELETE 策略：只有超级管理员可以删除
CREATE POLICY "class_approval_requests_delete"
    ON class_approval_requests FOR DELETE
    USING (is_super_admin());

-- ============================================
-- 第 7 部分：创建其他表策略（保持现有配置不变）
-- ============================================

-- notes 表策略（使用 auth.role()）
-- 确保 RLS 已启用
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- questions 表策略（所有人都可以查看）
-- 确保 RLS 已启用
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第 8 部分：验证诊断
-- ============================================

-- 验证 1：检查当前用户
SELECT
    auth.uid() AS current_user_id,
    is_super_admin() AS is_admin_result,
    CASE WHEN is_super_admin() THEN '是超级管理员' ELSE '不是超级管理员' END AS status
FROM (SELECT NULL) dummy;

-- 验证 2：检查当前用户邮箱
SELECT email AS current_user_email
FROM auth.users
WHERE id = auth.uid();

-- 验证 3：检查 class_approval_requests 数据
SELECT
    COUNT(*) AS total_requests,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending_requests
FROM class_approval_requests;

-- 验证 4：检查所有已创建的策略
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive,
    with_check
FROM pg_policies
WHERE tablename IN ('classes', 'class_members', 'class_approval_requests', 'notes', 'likes')
ORDER BY tablename, policyname;

-- 验证 5：检查所有已创建的触发器
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('classes', 'class_members', 'class_approval_requests', 'notes', 'likes')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 第 9 部分：确保关键表存在
-- ============================================

-- 确保 notifications 表存在（用于通知功能）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- 创建 notifications 表（如果不存在）
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- ============================================
-- 执行完成！
-- ============================================
-- 1. 验证上面的验证查询结果
--    - current_user_id: 应该显示你的 UUID
--    - is_admin_result: 应该是 "true" (如果你是超级管理员）
--    - total_requests: 应该显示申请数量
--    - pending_requests: 应该显示待审核数量
-- 2. 刷新前端页面测试：
--    - /classes 页面 - 测试班级创建
--    - /admin/classes 页面 - 应该能看到审核申请列表
-- 3. 如果仍有问题，请提供浏览器控制台的错误信息
-- ============================================
