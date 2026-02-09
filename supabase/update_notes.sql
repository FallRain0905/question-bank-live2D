-- ============================================
-- 只创建缺失的 note_tags 和 likes 表
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 1. 创建笔记-标签关联表（如果不存在）
CREATE TABLE IF NOT EXISTS note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- 2. 创建点赞表（如果不存在）
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, note_id)
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_note_id ON likes(note_id);

-- 4. 启用 RLS
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略 - note_tags 表
DROP POLICY IF EXISTS "登录用户可以查看笔记标签" ON note_tags;
DROP POLICY IF EXISTS "登录用户可以创建笔记标签" ON note_tags;

CREATE POLICY "登录用户可以查看笔记标签"
    ON note_tags FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "登录用户可以创建笔记标签"
    ON note_tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 6. 创建 RLS 策略 - likes 表
DROP POLICY IF EXISTS "登录用户可以查看点赞" ON likes;
DROP POLICY IF EXISTS "登录用户可以点赞" ON likes;
DROP POLICY IF EXISTS "用户可以取消点赞" ON likes;

CREATE POLICY "登录用户可以查看点赞"
    ON likes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "登录用户可以点赞"
    ON likes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "用户可以取消点赞"
    ON likes FOR DELETE
    USING (auth.uid() = user_id);

-- 7. 更新点赞计数触发器
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
