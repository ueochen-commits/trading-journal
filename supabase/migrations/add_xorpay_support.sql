-- =============================================================
-- XorPay 支付集成 Migration
-- 目标：添加 XorPay 相关字段，支持支付宝/微信支付
-- =============================================================

-- 1. 添加 XorPay 相关字段到 subscriptions 表
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS xorpay_order_id text,           -- XorPay 订单 ID
ADD COLUMN IF NOT EXISTS xorpay_trade_no text,           -- XorPay 交易号
ADD COLUMN IF NOT EXISTS payment_method text,            -- 支付方式: 'alipay' | 'wechat' | 'stripe'
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending', -- 支付状态: 'pending' | 'paid' | 'failed' | 'refunded'
ADD COLUMN IF NOT EXISTS paid_at timestamptz,            -- 支付完成时间
ADD COLUMN IF NOT EXISTS amount numeric,                 -- 支付金额
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CNY';    -- 货币: 'CNY' | 'USD'

-- 2. 创建支付订单表（可选，用于记录所有支付历史）
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  subscription_id uuid references subscriptions(id) on delete set null,

  -- XorPay 相关
  xorpay_order_id text unique,
  xorpay_trade_no text,

  -- 订单信息
  plan text not null check (plan in ('pro', 'elite', 'lifetime')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly', 'lifetime')),
  amount numeric not null,
  currency text default 'CNY',

  -- 支付信息
  payment_method text,  -- 'alipay' | 'wechat' | 'stripe'
  payment_status text default 'pending',
  paid_at timestamptz,

  -- 回调信息
  callback_data jsonb,  -- 存储 XorPay 回调的完整数据

  -- 时间戳
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 启用 RLS
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略 - 用户只能查看自己的订单
CREATE POLICY "Users can view own payment orders"
  ON payment_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment orders"
  ON payment_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_xorpay_order_id ON payment_orders(xorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_xorpay_order_id ON subscriptions(xorpay_order_id);

-- 6. 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. 添加注释
COMMENT ON TABLE payment_orders IS '支付订单表，记录所有支付历史';
COMMENT ON COLUMN payment_orders.xorpay_order_id IS 'XorPay 订单 ID';
COMMENT ON COLUMN payment_orders.payment_status IS '支付状态: pending(待支付) | paid(已支付) | failed(失败) | refunded(已退款)';
COMMENT ON COLUMN payment_orders.callback_data IS 'XorPay 回调的完整 JSON 数据';
