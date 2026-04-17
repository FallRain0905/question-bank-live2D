-- ============================================
-- 系统诊断查询
-- 在 Supabase SQL Editor 中执行此文件
-- 用于检查笔记显示问题的根本原因
-- ============================================

-- ============================================
-- 第1部分：检查数据库表结构
-- ============================================

-- 1.1 检查 class_members 表结构
-- 这是关键检查点 - 确认是否存在 status 列
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'class_members'
ORDER BY ordinal_position;

-- 1.2 检查 notes 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notes'
ORDER BY ordinal_position;

-- 1.3 检查 questions 表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- ============================================
-- 第2部分：检查数据状态
-- ============================================

-- 2.1 检查笔记状态分布
SELECT
    status,
    COUNT(*) as note_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM notes
GROUP BY status
ORDER BY status;

-- 2.2 检查题目状态分布
SELECT
    status,
    COUNT(*) as question_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM questions
GROUP BY status
ORDER BY status;

-- 2.3 检查待审核笔记详情
SELECT
    id,
    title,
    user_id,
    status,
    visibility,
    class_id,
    created_at,
    updated_at
FROM notes
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 2.4 检查班级成员状态分布
SELECT
    status,
    COUNT(*) as member_count
FROM class_members
GROUP BY status
ORDER BY status;

-- ============================================
-- 第3部分：检查用户权限配置
-- ============================================

-- 3.1 检查超级管理员
SELECT
    id,
    email,
    raw_user_meta_data->>'is_admin' as is_admin
FROM auth.users
WHERE raw_user_meta_data->>'is_admin' = 'true'
ORDER BY email;

-- 3.2 检查班级管理员和审核员
SELECT
    c.name as class_name,
    cm.role,
    u.email as user_email,
    cm.status as member_status,
    cm.joined_at
FROM class_members cm
JOIN classes c ON cm.class_id = c.id
JOIN auth.users u ON cm.user_id = u.id
WHERE cm.role IN ('creator', 'moderator')
ORDER BY c.name, cm.role;

-- 3.3 检查班级状态
SELECT
    id,
    name,
    creator_id,
    status,
    created_at,
    updated_at
FROM classes
ORDER BY status, created_at DESC;

-- ============================================
-- 第4部分：检查RLS策略
-- ============================================

-- 4.1 检查 notes 表的策略
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'notes'
ORDER BY policyname;

-- 4.2 检查 questions 表的策略
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'questions'
ORDER BY policyname;

-- 4.3 检查 class_members 表的策略
SELECT
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE tablename = 'class_members'
ORDER BY policyname;

-- ============================================
-- 第5部分：测试查询（模拟用户操作）
-- ============================================

-- 5.1 模拟查看笔记库（公开笔记）
-- 检查有多少公开且已审核的笔记
SELECT
    COUNT(*) as public_approved_notes
FROM notes
WHERE visibility = 'public' AND status = 'approved';

-- 5.2 模拟查看笔记库（班级笔记）
-- 检查有多少班级且已审核的笔记
SELECT
    COUNT(*) as class_approved_notes
FROM notes
WHERE visibility = 'class' AND status = 'approved';

-- 5.3 检查当前用户权限（需要登录用户）
-- 这会显示当前查询用户的ID
SELECT
    auth.uid() as current_user_id,
    auth.role() as current_user_role;

-- 5.4 检查特定用户可以看到的笔记
-- 使用当前登录用户ID进行测试
SELECT
    n.id,
    n.title,
    n.status,
    n.visibility,
    n.class_id,
    CASE
        WHEN n.visibility = 'public' AND n.status = 'approved' THEN '公开且已审核'
        WHEN n.visibility = 'class' AND n.status = 'approved' THEN '班级且已审核'
        WHEN n.user_id = auth.uid() THEN '自己的笔记'
        ELSE '不可见'
    END as visibility_status
FROM notes n
ORDER BY n.created_at DESC
LIMIT 10;

-- ============================================
-- 第6部分：检查关联数据
-- ============================================

-- 6.1 检查标签使用情况
SELECT
    t.name as tag_name,
    COUNT(nt.note_id) as note_count,
    COUNT(qt.question_id) as question_count
FROM tags t
LEFT JOIN note_tags nt ON t.id = nt.tag_id
LEFT JOIN question_tags qt ON t.id = qt.tag_id
GROUP BY t.id, t.name
ORDER BY (COUNT(nt.note_id) + COUNT(qt.question_id)) DESC
LIMIT 20;

-- 6.2 检查点赞数据
SELECT
    COUNT(*) as total_likes,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT note_id) as liked_notes
FROM likes;

-- 6.3 检查搜索历史
SELECT
    user_id,
    COUNT(*) as search_count,
    MAX(created_at) as last_search
FROM search_history
GROUP BY user_id
ORDER BY search_count DESC
LIMIT 10;

-- ============================================
-- 执行说明：
-- 1. 在 Supabase 控制台打开 SQL Editor
-- 2. 复制此文件的全部内容
-- 3. 粘贴到 SQL Editor 中
-- 4. 点击运行执行所有查询
-- 5. 查看输出结果进行诊断
--
-- 关键检查点：
-- - class_members 表是否有 status 列
-- - 是否有超级管理员配置
-- - 是否有待审核的笔记
-- - RLS 策略是否正确配置
--
-- 常见问题诊断：
-- - 如果 class_members 没有 status 列 → 执行 fix_class_members_status.sql
-- - 如果没有超级管理员 → 执行 ADMIN_SETUP.md 中的配置步骤
-- - 如果所有笔记都是 pending → 需要管理员审核通过
-- ============================================