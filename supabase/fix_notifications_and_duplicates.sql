-- ============================================
-- 修复通知约束问题和重复审核请求
-- ============================================

-- ============================================
-- 第 1 部分：修复 notifications 表的 type check constraint
-- ============================================

-- 首先检查现有的 check constraint 名称
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND contype = 'c';

-- 删除旧的 check constraint（如果存在）
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 创建新的 check constraint，包含所有需要的通知类型
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('comment', 'reply', 'like', 'follow', 'approve', 'class_approved', 'class_rejected', 'class_join'));

-- ============================================
-- 第 2 部分：修复重复审核请求问题
-- ============================================

-- 检查是否有重复的 class_approval_requests 记录
SELECT
    class_id,
    COUNT(*) AS duplicate_count,
    STRING_AGG(id::TEXT, ', ') AS ids
FROM class_approval_requests
GROUP BY class_id
HAVING COUNT(*) > 1;

-- 如果有重复，只保留最新的一条
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY requested_at DESC, id DESC) AS rn
    FROM class_approval_requests
)
DELETE FROM class_approval_requests
WHERE id IN (
    SELECT id FROM ranked WHERE rn > 1
);

-- 添加唯一约束防止未来重复（先检查是否存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_class_approval'
        AND conrelid = 'class_approval_requests'::regclass
    ) THEN
        ALTER TABLE class_approval_requests
            ADD CONSTRAINT unique_class_approval UNIQUE (class_id);
    END IF;
END $$;

-- ============================================
-- 第 3 部分：验证修复结果
-- ============================================

-- 验证 1：检查 notifications 的 check constraint
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND contype = 'c';

-- 验证 2：检查是否还有重复的审核请求
SELECT
    class_id,
    COUNT(*) AS count
FROM class_approval_requests
GROUP BY class_id
HAVING COUNT(*) > 1;

-- 验证 3：检查所有触发器
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table IN ('classes', 'class_members')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 修复完成
-- ============================================
-- 1. notifications 表现在支持 class_approved, class_rejected, class_join 类型
-- 2. 重复的审核请求已被清理
-- 3. 添加了唯一约束防止未来出现重复
-- 4. 现在可以正常批准/拒绝班级申请了
-- ============================================
