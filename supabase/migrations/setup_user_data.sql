-- 确保 uuid 扩展已启用
create extension if not exists "uuid-ossp";

-- 交易日志表
CREATE TABLE IF NOT EXISTS trading_journals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  symbol text not null,
  direction text check (direction in ('long', 'short')),
  entry_price numeric,
  exit_price numeric,
  pnl numeric,
  pnl_percent numeric,
  setup text,
  notes text,
  emotions text,
  screenshot_url text,
  created_at timestamptz default now()
);

-- 用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  username text,
  name text,
  avatar_url text,
  tier text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 订阅表
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free' check (plan in ('free', 'pro', 'elite')),
  status text default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- 启用 RLS
ALTER TABLE trading_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can manage own journals" ON trading_journals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);
