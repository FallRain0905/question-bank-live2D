-- 创建学习事实表（事实层）
CREATE TABLE IF NOT EXISTS learning_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
  entity TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('performance', 'goals', 'gaps', 'patterns', 'progress')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_learning_facts_user_id ON learning_facts(userId);
CREATE INDEX IF NOT EXISTS idx_learning_facts_importance ON learning_facts(importance DESC);
CREATE INDEX IF NOT EXISTS idx_learning_facts_timestamp ON learning_facts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_learning_facts_category ON learning_facts(category);

-- 创建学习反思表（反思层）
CREATE TABLE IF NOT EXISTS learning_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  supportingFacts UUID[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('performance', 'efficiency', 'behavioral', 'knowledge')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_learning_reflections_user_id ON learning_reflections(userId);
CREATE INDEX IF NOT EXISTS idx_learning_reflections_confidence ON learning_reflections(confidence DESC);

-- 创建学习画像表（画像层）
CREATE TABLE IF NOT EXISTS learning_persona (
  userId UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  academicLevel TEXT NOT NULL DEFAULT 'beginner',
  learningStyle TEXT NOT NULL DEFAULT 'balanced',
  motivation TEXT NOT NULL DEFAULT 'mixed',
  goals TEXT[] NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{"teachingStyle": "balanced", "pacing": "moderate", "feedback": "detailed"}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 启用行级安全性
ALTER TABLE learning_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_persona ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can view their own learning facts"
  ON learning_facts FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own learning facts"
  ON learning_facts FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own learning facts"
  ON learning_facts FOR UPDATE
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete their own learning facts"
  ON learning_facts FOR DELETE
  USING (auth.uid() = userId);

CREATE POLICY "Users can view their own learning reflections"
  ON learning_reflections FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own learning reflections"
  ON learning_reflections FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own learning reflections"
  ON learning_reflections FOR UPDATE
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete their own learning reflections"
  ON learning_reflections FOR DELETE
  USING (auth.uid() = userId);

CREATE POLICY "Users can view their own learning persona"
  ON learning_persona FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY "Users can insert their own learning persona"
  ON learning_persona FOR INSERT
  WITH CHECK (auth.uid() = userId);

CREATE POLICY "Users can update their own learning persona"
  ON learning_persona FOR UPDATE
  USING (auth.uid() = userId);

CREATE POLICY "Users can delete their own learning persona"
  ON learning_persona FOR DELETE
  USING (auth.uid() = userId);
