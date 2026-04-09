-- 添加班级审核状态字段
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 添加拒绝原因字段
ALTER TABLE classes ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- 创建审核请求表
CREATE TABLE IF NOT EXISTS class_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    message TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_class_approval_requests_class_id ON class_approval_requests(class_id);
CREATE INDEX IF NOT EXISTS idx_class_approval_requests_user_id ON class_approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_class_approval_requests_status ON class_approval_requests(status);

-- 启用 RLS
ALTER TABLE class_approval_requests ENABLE ROW LEVEL SECURITY;

-- 班级审核请求表的 RLS 策略
DROP POLICY IF EXISTS "所有人可以查看审核请求" ON class_approval_requests;
CREATE POLICY "所有人可以查看审核请求" ON class_approval_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "认证用户可以创建审核请求" ON class_approval_requests;
CREATE POLICY "认证用户可以创建审核请求" ON class_approval_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "管理员可以更新审核请求" ON class_approval_requests;
CREATE POLICY "管理员可以更新审核请求" ON class_approval_requests FOR UPDATE USING (
    auth.uid() IN (
        SELECT id FROM auth.users WHERE user_metadata->>'is_admin' = 'true'
    )
);

-- 触发器：创建班级时自动创建审核请求
CREATE OR REPLACE FUNCTION create_approval_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        INSERT INTO class_approval_requests (class_id, user_id, name, description, invite_code, status)
        VALUES (NEW.id, NEW.creator_id, NEW.name, NEW.description, NEW.invite_code, 'pending');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_class_create_request ON classes;
CREATE TRIGGER on_class_create_request
    AFTER INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION create_approval_request();