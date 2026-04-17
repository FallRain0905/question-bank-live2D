-- ============================================
-- 修复 class_members 表结构
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================

-- 第一步：检查 class_members 表当前结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'class_members'
ORDER BY ordinal_position;

-- 第二步：添加 status 列（如果不存在）
ALTER TABLE class_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 第三步：为现有记录设置正确的状态
UPDATE class_members SET status = 'approved' WHERE status IS NULL;

-- 第四步：验证修复结果
SELECT
    status,
    COUNT(*) as count
FROM class_members
GROUP BY status;

-- 第五步：检查班级成员分布
SELECT
    c.name as class_name,
    cm.role,
    cm.status,
    COUNT(*) as member_count
FROM class_members cm
JOIN classes c ON cm.class_id = c.id
GROUP BY c.name, cm.role, cm.status
ORDER BY c.name, cm.role, cm.status;

-- ============================================
-- 执行说明：
-- 1. 在 Supabase 控制台打开 SQL Editor
-- 2. 复制此文件的全部内容
-- 3. 粘贴到 SQL Editor 中
-- 4. 点击运行执行所有查询
-- 5. 查看输出结果确认修复成功
--
-- 预期结果：
-- - status 列应该存在
-- - 所有现有记录的 status 应该为 'approved'
-- - 不应该出现错误信息
-- ============================================