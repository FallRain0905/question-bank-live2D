-- 设置超级管理员和公告系统

-- 1. 将指定用户设置为超级管理员
-- 替换 'your-email-here' 为你的邮箱
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb
WHERE email = '3283254551@qq.com';

-- 2. 创建公告表
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. 创建用户公告阅读记录表
CREATE TABLE IF NOT EXISTS announcement_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- 4. 创建提醒表（用户阅读后不再显示）
CREATE TABLE IF NOT EXISTS user_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dismissal_type TEXT NOT NULL, -- 'announcement' 或其他类型
    identifier TEXT, -- 公告ID或其他标识
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, dismissal_type, identifier)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_views ON announcement_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dismissals ON user_dismissals(user_id, dismissal_type);

-- 启用 RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dismissals ENABLE ROW LEVEL SECURITY;

-- 公告表 RLS 策略
DROP POLICY IF EXISTS "所有人可以查看公告" ON announcements;
CREATE POLICY "所有人可以查看公告" ON announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "只有管理员可以创建公告" ON announcements;
CREATE POLICY "只有管理员可以创建公告" ON announcements FOR INSERT WITH CHECK (
  auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid())
  OR auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin'::text FROM auth.users WHERE email = '3283254551@qq.com' LIMIT 1)
);

DROP POLICY IF EXISTS "只有管理员可以更新公告" ON announcements;
CREATE POLICY "只有管理员可以更新公告" ON announcements FOR UPDATE USING (
  auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid())
  OR auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin'::text FROM auth.users WHERE email = '3283254551@qq.com' LIMIT 1)
);

DROP POLICY IF EXISTS "只有管理员可以删除公告" ON announcements;
CREATE POLICY "只有管理员可以删除公告" ON announcements FOR DELETE USING (
  auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin' FROM auth.users WHERE id = auth.uid())
  OR auth.uid()::text = (SELECT raw_user_meta_data->>'is_admin'::text FROM auth.users WHERE email = '3283254551@qq.com' LIMIT 1)
);

-- 公告阅读记录 RLS 策略
DROP POLICY IF EXISTS "用户可以记录公告阅读" ON announcement_views;
CREATE POLICY "用户可以记录公告阅读" ON announcement_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "所有人可以查看阅读记录" ON announcement_views;
CREATE POLICY "所有人可以查看阅读记录" ON announcement_views FOR SELECT USING (true);

-- 用户关闭记录 RLS 策略
DROP POLICY IF EXISTS "用户可以记录关闭状态" ON user_dismissals;
CREATE POLICY "用户可以记录关闭状态" ON user_dismissals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "用户可以查看自己的关闭记录" ON user_dismissals;
CREATE POLICY "用户可以查看自己的关闭记录" ON user_dismissals FOR SELECT USING (auth.uid() = user_id);
