-- ============================================
-- 笔记功能 - 完整数据库表结构更新
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 1. 创建笔记表
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建笔记-标签关联表
CREATE TABLE IF NOT EXISTS note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- 3. 创建点赞表
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, note_id)
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_note_id ON likes(note_id);

-- 5. 启用 RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略 - notes 表

-- 所有登录用户都可以查看笔记
CREATE POLICY "登录用户可以查看笔记"
    ON notes FOR SELECT
    USING (auth.role() = 'authenticated');

-- 所有登录用户都可以创建笔记
CREATE POLICY "登录用户可以创建笔记"
    ON notes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 所有登录用户都可以更新笔记（管理员权限在应用层控制）
CREATE POLICY "登录用户可以更新笔记"
    ON notes FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 创建者可以删除自己的笔记
CREATE POLICY "创建者可以删除自己的笔记"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- 7. 创建 RLS 策略 - note_tags 表

-- 所有登录用户都可以查看笔记标签
CREATE POLICY "登录用户可以查看笔记标签"
    ON note_tags FOR SELECT
    USING (auth.role() = 'authenticated');

-- 所有登录用户可以创建笔记标签
CREATE POLICY "登录用户可以创建笔记标签"
    ON note_tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 8. 创建 RLS 策略 - likes 表

-- 所有登录用户都可以查看点赞
CREATE POLICY "登录用户可以查看点赞"
    ON likes FOR SELECT
    USING (auth.role() = 'authenticated');

-- 所有登录用户都可以创建点赞
CREATE POLICY "登录用户可以点赞"
    ON likes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 用户可以取消自己的点赞
CREATE POLICY "用户可以取消点赞"
    ON likes FOR DELETE
    USING (auth.uid() = user_id);

-- 9. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. 更新点赞计数触发器
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE notes SET likes_count = likes_count + 1 WHERE id = NEW.note_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE notes SET likes_count = likes_count - 1 WHERE id = OLD.note_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notes_likes_count ON likes;
CREATE TRIGGER update_notes_likes_count AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_likes_count();
