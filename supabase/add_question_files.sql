-- 为 questions 表添加文档文件支持
-- 在 Supabase SQL Editor 中执行此文件

-- 添加文档相关字段
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS question_file_url TEXT,
ADD COLUMN IF NOT EXISTS question_file_name TEXT,
ADD COLUMN IF NOT EXISTS question_file_type TEXT,
ADD COLUMN IF NOT EXISTS question_file_size BIGINT,
ADD COLUMN IF NOT EXISTS answer_file_url TEXT,
ADD COLUMN IF NOT EXISTS answer_file_name TEXT,
ADD COLUMN IF NOT EXISTS answer_file_type TEXT,
ADD COLUMN IF NOT EXISTS answer_file_size BIGINT;
