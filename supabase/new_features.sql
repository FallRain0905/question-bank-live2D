-- ============================================
-- 新功能数据库表：评论、收藏、通知
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 0. 创建用户公开信息表
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户公开信息表 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "所有人可以查看用户信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以编辑自己的信息" ON user_profiles;
DROP POLICY IF EXISTS "用户可以插入自己的信息" ON user_profiles;

CREATE POLICY "所有人可以查看用户信息"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "用户可以编辑自己的信息"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的信息"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 创建触发器：当用户注册时自动创建 profile
-- 注意：auth.users 表的元数据字段是 raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'username',
            SPLIT_PART(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建新触发器（需要在 Supabase Dashboard 的 Auth Triggers 中设置）
-- 或者使用以下方式（需要 service_role 权限）

-- 1. 创建评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('question', 'note')),
    target_id UUID NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('question', 'note')),
    target_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- 3. 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'like', 'follow', 'approve')),
    title TEXT NOT NULL,
    content TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 创建关注表
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- 5. 搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_target ON favorites(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, created_at DESC);

-- 7. 启用 RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- 8. 评论表 RLS 策略
DROP POLICY IF EXISTS "登录用户可以查看评论" ON comments;
DROP POLICY IF EXISTS "登录用户可以创建评论" ON comments;
DROP POLICY IF EXISTS "用户可以编辑自己的评论" ON comments;
DROP POLICY IF EXISTS "用户可以删除自己的评论" ON comments;

CREATE POLICY "登录用户可以查看评论"
    ON comments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "登录用户可以创建评论"
    ON comments FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "用户可以编辑自己的评论"
    ON comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的评论"
    ON comments FOR DELETE
    USING (auth.uid() = user_id);

-- 9. 收藏表 RLS 策略
DROP POLICY IF EXISTS "用户可以查看自己的收藏" ON favorites;
DROP POLICY IF EXISTS "用户可以添加收藏" ON favorites;
DROP POLICY IF EXISTS "用户可以删除收藏" ON favorites;

CREATE POLICY "用户可以查看自己的收藏"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以添加收藏"
    ON favorites FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "用户可以删除收藏"
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);

-- 10. 通知表 RLS 策略
DROP POLICY IF EXISTS "用户可以查看自己的通知" ON notifications;
DROP POLICY IF EXISTS "用户可以标记通知已读" ON notifications;
DROP POLICY IF EXISTS "系统可以创建通知" ON notifications;

CREATE POLICY "用户可以查看自己的通知"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以标记通知已读"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "系统可以创建通知"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- 11. 关注表 RLS 策略
DROP POLICY IF EXISTS "用户可以查看关注关系" ON follows;
DROP POLICY IF EXISTS "用户可以关注他人" ON follows;
DROP POLICY IF EXISTS "用户可以取消关注" ON follows;

CREATE POLICY "用户可以查看关注关系"
    ON follows FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "用户可以关注他人"
    ON follows FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = follower_id);

CREATE POLICY "用户可以取消关注"
    ON follows FOR DELETE
    USING (auth.uid() = follower_id);

-- 12. 搜索历史 RLS 策略
DROP POLICY IF EXISTS "用户可以查看自己的搜索历史" ON search_history;
DROP POLICY IF EXISTS "用户可以添加搜索历史" ON search_history;

CREATE POLICY "用户可以查看自己的搜索历史"
    ON search_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "用户可以添加搜索历史"
    ON search_history FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 13. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. 添加收藏计数字段到 questions 和 notes 表
ALTER TABLE questions ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
