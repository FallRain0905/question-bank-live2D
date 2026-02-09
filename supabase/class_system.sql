-- 班级管理系统数据库表

-- 1. 班级表
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 班级成员表
CREATE TABLE IF NOT EXISTS class_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, user_id)
);

-- 3. 为 questions 表添加文件和班级字段
ALTER TABLE questions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_file_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_file_name TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_file_type TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_file_size BIGINT;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_file_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_file_name TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_file_type TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_file_size BIGINT;

-- 4. 为 notes 表添加班级字段
ALTER TABLE notes ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_classes_invite_code ON classes(invite_code);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_class_id ON questions(class_id);
CREATE INDEX IF NOT EXISTS idx_notes_class_id ON notes(class_id);

-- 启用 RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;

-- 班级表的 RLS 策略
DROP POLICY IF EXISTS "所有人可以查看班级" ON classes;
CREATE POLICY "所有人可以查看班级" ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "认证用户可以创建班级" ON classes;
CREATE POLICY "认证用户可以创建班级" ON classes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "班级创建者可以更新班级" ON classes;
CREATE POLICY "班级创建者可以更新班级" ON classes FOR UPDATE USING (auth.uid() = creator_id);

-- 班级成员表的 RLS 策略
DROP POLICY IF EXISTS "所有人可以查看班级成员" ON class_members;
CREATE POLICY "所有人可以查看班级成员" ON class_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "认证用户可以加入班级" ON class_members;
CREATE POLICY "认证用户可以加入班级" ON class_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "用户可以更新自己的成员信息" ON class_members;
CREATE POLICY "用户可以更新自己的成员信息" ON class_members FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "用户可以退出班级" ON class_members;
CREATE POLICY "用户可以退出班级" ON class_members FOR DELETE USING (auth.uid() = user_id);

-- 生成唯一邀请码的函数
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(encode(gen_random_bytes(16), 'base64'), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- 触发器：创建班级时自动生成邀请码
CREATE OR REPLACE FUNCTION set_class_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_class_insert ON classes;
CREATE TRIGGER on_class_insert
    BEFORE INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION set_class_invite_code();

-- 触发器：创建班级时自动将创建者设为成员
CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO class_members (class_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'creator');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_class_create ON classes;
CREATE TRIGGER on_class_create
    AFTER INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION add_creator_as_member();
