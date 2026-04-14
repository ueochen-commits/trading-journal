-- ============================================================
-- Exchange Integration: 扩展账户 & 连接表
-- ============================================================

-- 扩展 trading_accounts 表
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS exchange text;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS broker_logo_url text;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS broker_brand_color text;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS profit_method text DEFAULT 'FIFO';
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'manual';
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS last_sync timestamptz;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS next_sync timestamptz;
ALTER TABLE trading_accounts ADD COLUMN IF NOT EXISTS exchange_connection_id uuid REFERENCES exchange_connections(id) ON DELETE SET NULL;

-- 扩展 exchange_connections 表
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'main';
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS skip_spot boolean DEFAULT false;
ALTER TABLE exchange_connections ADD COLUMN IF NOT EXISTS start_date date;

-- 给 trading_journals 添加 account_id（关联到 trading_accounts）
ALTER TABLE trading_journals ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES trading_accounts(id) ON DELETE SET NULL;
