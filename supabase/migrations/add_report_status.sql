-- 添加 status 字段到 reports 表
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text check (status in ('pending', 'completed', 'failed')) default 'pending';

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
