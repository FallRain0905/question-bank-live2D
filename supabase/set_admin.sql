-- 设置超级管理员权限
-- 将指定用户设置为超级管理员

-- 更新 auth.users 表中的 user_metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{is_admin}',
    'true'
)
WHERE email = '3283254551@qq.com';

-- 查询确认
SELECT
    email,
    raw_user_meta_data->>'is_admin' as is_admin_in_auth,
    raw_user_meta_data->>'username' as username,
    raw_user_meta_data->>'display_name' as display_name
FROM auth.users
WHERE email = '3283254551@qq.com';

-- 提示用户需要重新登录以获取新的权限
-- 执行此 SQL 后，请：
-- 1. 退出当前登录
-- 2. 重新登录该账号
-- 3. 验证超级管理员权限