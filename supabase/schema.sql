-- ============================================
-- 题库系统数据库表结构
-- 在 Supabase 的 SQL Editor 中执行此文件
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 标签表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 题目表
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- 关联到 auth.users
    question_text TEXT,
    question_image_url TEXT,
    answer_text TEXT,
    answer_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 题目-标签关联表
CREATE TABLE IF NOT EXISTS question_tags (
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- 创建索引以提高搜索性能
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_question_text ON questions USING gin(to_tsvector('simple', question_text));

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
-- tags 表不需要 RLS，所有人都可以读取和创建标签

-- 题目表策略：
-- 1. 任何登录用户可以查看所有题目
CREATE POLICY "任何人都可以查看题目"
    ON questions FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. 只有创建者可以删除自己的题目
CREATE POLICY "只有创建者可以删除题目"
    ON questions FOR DELETE
    USING (auth.uid() = user_id);

-- 3. 任何登录用户可以插入题目
CREATE POLICY "登录用户可以创建题目"
    ON questions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 题目-标签关联表策略：
-- 1. 任何登录用户可以查看关联
CREATE POLICY "任何人都可以查看题目标签关联"
    ON question_tags FOR SELECT
    USING (auth.role() = 'authenticated');

-- 2. 任何登录用户可以插入关联
CREATE POLICY "登录用户可以创建题目标签关联"
    ON question_tags FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 3. 任何人可以通过级联删除关联（由外键处理）
CREATE POLICY "任何人都可以删除题目标签关联"
    ON question_tags FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- 存储桶设置（在 Supabase 控制台的 Storage 中手动创建）
-- ============================================
-- 需要创建一个名为 'question-images' 的存储桶
-- 并设置其权限为：公开读取，认证用户可写入

-- ============================================
-- 示例数据（可选）
-- ============================================
-- INSERT INTO tags (name) VALUES ('数学'), ('语文'), ('英语'), ('物理'), ('化学');
