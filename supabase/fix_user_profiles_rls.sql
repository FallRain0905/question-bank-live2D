-- ============================================
-- 修复 user_profiles 表 RLS 和用户名问题
-- ============================================

-- ============================================
-- 第 1 部分：确保 user_profiles 表结构和数据正确
-- ============================================

-- 确保表存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        CREATE TABLE user_profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            username TEXT UNIQUE,
            display_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 为 auth.users 中存在但 user_profiles 中不存在的用户创建记录
-- 使用邮箱作为默认用户名（确保唯一性）
INSERT INTO user_profiles (id, username, display_name)
SELECT
    au.id,
    au.email,  -- 使用完整邮箱作为默认用户名，避免冲突
    au.email   -- display_name 也使用邮箱
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 修复现有的空用户名（使用邮箱）
UPDATE user_profiles up
SET
    username = COALESCE(NULLIF(up.username, ''), au.email, 'user_' || up.id::TEXT),
    display_name = COALESCE(NULLIF(up.display_name, ''), au.email, '用户')
FROM auth.users au
WHERE up.id = au.id
AND (up.username IS NULL OR up.username = '' OR up.display_name IS NULL OR up.display_name = '');

-- ============================================
-- 第 2 部分：正确配置 RLS 策略
-- ============================================

-- 确保 RLS 已启用
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除所有旧策略（无论名称如何）
DROP POLICY IF EXISTS "所有人可以查看用户信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以编辑自己的信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以插入自己的信息" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;

-- 创建新的 RLS 策略
-- SELECT 策略：所有人都可以查看用户信息（不需要登录）
CREATE POLICY "user_profiles_select"
    ON user_profiles FOR SELECT
    USING (true);

-- UPDATE 策略：用户只能编辑自己的信息
CREATE POLICY "user_profiles_update"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- INSERT 策略：用户只能插入自己的信息
CREATE POLICY "user_profiles_insert"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- DELETE 策略：用户只能删除自己的信息
CREATE POLICY "user_profiles_delete"
    ON user_profiles FOR DELETE
    USING (auth.uid() = id);

-- ============================================
-- 第 3 部分：修复用户注册触发器
-- ============================================

-- 删除旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 重新创建触发器函数（带 SECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 1;
BEGIN
    -- 尝试从 user_metadata 获取用户名
    base_username := COALESCE(
        NULLIF(NEW.user_metadata->>'username', ''),
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- 确保用户名唯一
    final_username := base_username;
    WHILE EXISTS (SELECT 1 FROM user_profiles WHERE username = final_username) LOOP
        final_username := base_username || counter::TEXT;
        counter := counter + 1;
    END LOOP;

    -- 插入用户资料
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        final_username,
        COALESCE(
            NULLIF(NEW.user_metadata->>'display_name', ''),
            NULLIF(NEW.user_metadata->>'username', ''),
            final_username
        )
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- 如果仍然冲突，使用 UUID 作为用户名
        INSERT INTO public.user_profiles (id, username, display_name)
        VALUES (NEW.id, 'user_' || NEW.id::TEXT, NEW.email);
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 第 4 部分：验证修复结果
-- ============================================

-- 验证 1：检查当前用户是否能查询到自己的资料
SELECT
    '当前用户资料' AS test_name,
    COUNT(*) AS result_count
FROM user_profiles
WHERE id = auth.uid();

-- 验证 2：检查是否能查询到所有资料
SELECT
    '查询所有资料' AS test_name,
    COUNT(*) AS result_count
FROM user_profiles;

-- 验证 3：检查 RLS 策略
SELECT
    policyname,
    cmd,
    CASE
        WHEN qual = 'true' THEN '允许所有人'
        ELSE qual
    END AS access_condition
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- 验证 4：查看所有用户资料
SELECT
    id,
    username,
    display_name,
    avatar_url
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- 验证 5：检查是否有空的用户名
SELECT
    id,
    username,
    display_name
FROM user_profiles
WHERE username IS NULL OR username = '' OR display_name IS NULL OR display_name = '';

-- ============================================
-- 修复完成
-- ============================================
-- 1. user_profiles 表的 RLS 策略已正确配置，所有人都可以查询
-- 2. 现有数据已修复，使用邮箱作为默认用户名
-- 3. 用户注册时会自动创建唯一用户名
-- 4. 刷新前端页面，应该能正确显示用户名了
-- ============================================
