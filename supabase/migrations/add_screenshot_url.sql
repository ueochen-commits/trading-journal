-- 添加图片字段到 trading_journals 表
ALTER TABLE trading_journals ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
