-- ============================================
-- AI对话记忆系统数据库表结构
-- 支持用户特定的对话存储和记忆管理
-- ============================================

-- 1. AI对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '新对话',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. AI消息表
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. 用户AI设置表
CREATE TABLE IF NOT EXISTS user_ai_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_name TEXT DEFAULT 'AI助手',
    assistant_model TEXT DEFAULT 'default',
    assistant_personality TEXT DEFAULT '友好、专业、乐于助人',
    max_memory_days INTEGER DEFAULT 30,
    max_messages_per_conversation INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_is_active ON ai_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at DESC);

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- AI对话表策略：
-- 1. 用户只能查看自己的对话
CREATE POLICY "用户只能查看自己的对话"
    ON ai_conversations FOR SELECT
    USING (auth.uid() = user_id);

-- 2. 用户可以创建自己的对话
CREATE POLICY "用户可以创建对话"
    ON ai_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. 用户可以更新自己的对话
CREATE POLICY "用户可以更新自己的对话"
    ON ai_conversations FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. 用户可以删除自己的对话
CREATE POLICY "用户可以删除自己的对话"
    ON ai_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- AI消息表策略：
-- 1. 用户只能查看自己对话的消息
CREATE POLICY "用户只能查看自己对话的消息"
    ON ai_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- 2. 用户可以创建自己对话的消息
CREATE POLICY "用户可以创建消息"
    ON ai_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_conversations
            WHERE ai_conversations.id = ai_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- 用户AI设置表策略：
-- 1. 用户只能查看自己的设置
CREATE POLICY "用户只能查看自己的设置"
    ON user_ai_settings FOR SELECT
    USING (auth.uid() = user_id);

-- 2. 用户可以创建自己的设置
CREATE POLICY "用户可以创建设置"
    ON user_ai_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. 用户可以更新自己的设置
CREATE POLICY "用户可以更新自己的设置"
    ON user_ai_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 触发器：自动更新 updated_at 字段
-- ============================================

-- AI对话表触发器
CREATE OR REPLACE FUNCTION update_ai_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_conversations_updated_at_trigger
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_conversations_updated_at();

-- 用户AI设置表触发器
CREATE OR REPLACE FUNCTION update_user_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_ai_settings_updated_at_trigger
    BEFORE UPDATE ON user_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_ai_settings_updated_at();

-- ============================================
-- 视图：简化对话查询
-- ============================================

-- 活跃对话视图（包含消息数量）
CREATE OR REPLACE VIEW active_conversations AS
SELECT
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    c.metadata,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at
FROM ai_conversations c
LEFT JOIN ai_messages m ON c.id = m.conversation_id
WHERE c.is_active = true
GROUP BY c.id;

-- ============================================
-- 实用函数
-- ============================================

-- 获取用户的活跃对话
CREATE OR REPLACE FUNCTION get_user_active_conversations(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    message_count BIGINT,
    last_message_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
    FROM ai_conversations c
    LEFT JOIN ai_messages m ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id AND c.is_active = true
    GROUP BY c.id
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 清理过期对话（超过最大记忆天数）
CREATE OR REPLACE FUNCTION cleanup_old_conversations(p_user_id UUID, p_max_days INTEGER)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_conversations
    WHERE user_id = p_user_id
    AND is_active = false
    AND updated_at < NOW() - (p_max_days || ' days')::interval;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;