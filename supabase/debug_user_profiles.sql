-- ============================================
-- 调试 user_profiles 表 RLS 问题
-- ============================================

-- 1. 检查当前用户 ID
SELECT auth.uid() AS current_user_id;

-- 2. 检查 user_profiles 的 RLS 策略
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 3. 检查 RLS 是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- 4. 尝试作为当前用户查询 user_profiles（模拟前端查询）
-- 这会展示当前用户能看到什么数据
SELECT
    id,
    username,
    display_name,
    avatar_url
FROM user_profiles
LIMIT 10;

-- 5. 检查 class_members 中的用户 ID
SELECT
    id AS member_id,
    user_id,
    class_id,
    status
FROM class_members
LIMIT 10;

-- 6. 使用 IN 子句查询（模拟前端的查询方式）
SELECT
    id,
    username,
    display_name,
    avatar_url
FROM user_profiles
WHERE id IN (
    SELECT user_id FROM class_members LIMIT 5
);

-- 7. 检查 user_profiles 中是否有你（当前用户）的记录
SELECT
    up.id,
    up.username,
    up.display_name,
    up.avatar_url,
    up.created_at
FROM user_profiles up
WHERE up.id = auth.uid();

-- ============================================
-- 诊断完成
-- ============================================
-- 如果查询 7 没有返回结果，说明当前用户没有 user_profiles 记录
-- 如果查询 4 没有返回结果，说明 RLS 策略有问题
-- ============================================
