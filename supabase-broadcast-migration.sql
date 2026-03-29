-- ================================================================
-- TradeGrail 广播通知系统
-- 在 Supabase Dashboard → SQL Editor 里执行这段 SQL
-- ================================================================

-- 1. 广播通知表（管理员在这里写数据）
CREATE TABLE IF NOT EXISTS broadcast_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL DEFAULT 'system',   -- system | alert | upgrade
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,    -- 设为 false 可下架通知
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 已读记录表（每个用户读过哪些广播）
CREATE TABLE IF NOT EXISTS broadcast_reads (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broadcast_id  UUID NOT NULL REFERENCES broadcast_notifications(id) ON DELETE CASCADE,
  read_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, broadcast_id)
);

-- 3. RLS 权限设置
ALTER TABLE broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_reads ENABLE ROW LEVEL SECURITY;

-- 所有登录用户可读取有效广播
CREATE POLICY "Authenticated users can read active broadcasts"
  ON broadcast_notifications FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- 用户只能读/写自己的已读记录
CREATE POLICY "Users manage their own broadcast reads"
  ON broadcast_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 开启 Realtime（让前端能实时收到新广播）
ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_notifications;
