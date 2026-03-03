-- ============================================
-- 诊断并修复 user_profiles 表数据问题
-- ============================================

-- ============================================
-- 第 1 部分：诊断问题
-- ============================================

-- 检查 user_profiles 表是否有数据
SELECT COUNT(*) AS total_profiles FROM user_profiles;

-- 检查有多少用户没有 username 或 display_name
SELECT
    COUNT(*) AS empty_profiles_count
FROM user_profiles
WHERE username IS NULL OR username = '' OR display_name IS NULL OR display_name = '';

-- 查看所有用户资料（包括空值的）
SELECT
    id,
    username,
    display_name,
    avatar_url,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 20;

-- 对比 auth.users 和 user_profiles，看看哪些用户没有 profile
SELECT
    au.id AS user_id,
    au.email,
    au.created_at AS auth_created_at,
    up.username,
    up.display_name,
    up.created_at AS profile_created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC
LIMIT 20;

-- ============================================
-- 第 2 部分：修复现有数据
-- ============================================

-- 为所有没有 username 或 display_name 的用户设置默认值（使用邮箱前缀）
UPDATE user_profiles up
SET
    username = COALESCE(up.username, SPLIT_PART(au.email, '@', 1)),
    display_name = COALESCE(up.display_name, SPLIT_PART(au.email, '@', 1))
FROM auth.users au
WHERE up.id = au.id
AND (up.username IS NULL OR up.username = '');

-- 为 auth.users 中存在但 user_profiles 中不存在的用户创建记录
INSERT INTO user_profiles (id, username, display_name)
SELECT
    au.id,
    SPLIT_PART(au.email, '@', 1),
    SPLIT_PART(au.email, '@', 1)
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
);

-- ============================================
-- 第 3 部分：确保触发器正确配置
-- ============================================

-- 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 重新创建用户注册触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.user_metadata->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.user_metadata->>'display_name',
            NEW.user_metadata->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 第 4 部分：确保 user_profiles RLS 策略正确
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "所有人可以查看用户信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以编辑自己的信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以插入自己的信息" ON user_profiles;

-- 重新创建策略
CREATE POLICY "所有人可以查看用户信息"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "用户可以编辑自己的信息"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的信息"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 第 5 部分：验证修复结果
-- ============================================

-- 验证 1：检查是否还有空的用户名
SELECT
    COUNT(*) AS empty_username_count
FROM user_profiles
WHERE username IS NULL OR username = '';

-- 验证 2：查看修复后的用户资料
SELECT
    id,
    username,
    display_name,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 验证 3：检查 class_members 中的用户是否有对应的 profile
SELECT
    cm.id AS member_id,
    cm.user_id,
    up.username,
    up.display_name
FROM class_members cm
LEFT JOIN user_profiles up ON cm.user_id = up.id
WHERE cm.status = 'approved'
LIMIT 10;

-- ============================================
-- 修复完成
-- ============================================
-- 1. 所有现有用户的 username 和 display_name 已设置
-- 2. 用户注册时会自动创建 profile
-- 3. user_profiles 表的 RLS 策略已正确配置
-- 4. 现在成员管理页面应该能正确显示用户名了
-- ============================================
