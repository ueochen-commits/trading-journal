-- 用户资料表 (已有，创建缺失的)
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

-- 交易日志表 (已有)
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

-- 订阅表 (已有)
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

-- 交易账户表
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  balance numeric default 0,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references trading_accounts(id) on delete set null,
  symbol text not null,
  direction text not null,
  entry_price numeric not null,
  exit_price numeric,
  quantity numeric not null,
  status text not null,
  notes text,
  entry_time timestamptz not null,
  exit_time timestamptz,
  pnl numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 策略表
CREATE TABLE IF NOT EXISTS strategies (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  rules jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  settings jsonb default '{}',
  risk_settings jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 追踪规则表
CREATE TABLE IF NOT EXISTS tracker_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  name text not null,
  value numeric,
  is_enabled boolean default true,
  created_at timestamptz default now()
);

-- 每日计划表
CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  focus_symbols text[],
  trade_ideas text,
  key_levels text,
  risk_percentage numeric,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 情绪日志表
CREATE TABLE IF NOT EXISTS emotion_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  emotion text not null,
  intensity numeric check (intensity between 1 and 10),
  trigger_event text,
  notes text,
  created_at timestamptz default now()
);

-- 周目标表
CREATE TABLE IF NOT EXISTS weekly_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  week_start date not null,
  goal_type text not null,
  target_value numeric not null,
  current_value numeric default 0,
  is_achieved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 纪律规则表
CREATE TABLE IF NOT EXISTS discipline_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  rule_type text not null,
  description text not null,
  is_enabled boolean default true,
  created_at timestamptz default now()
);

-- 每日纪律记录表
CREATE TABLE IF NOT EXISTS daily_discipline_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  rule_id uuid references discipline_rules(id) on delete cascade,
  is_completed boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- 检查清单表
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  checklist_type text not null,
  title text not null,
  description text,
  is_enabled boolean default true,
  order_index numeric default 0,
  created_at timestamptz default now()
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  title text not null,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 交易所连接表
CREATE TABLE IF NOT EXISTS exchange_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exchange text not null,
  api_key_encrypted text,
  api_secret_encrypted text,
  is_active boolean default true,
  last_sync timestamptz,
  created_at timestamptz default now()
);

-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_connections ENABLE ROW LEVEL SECURITY;

-- RLS 策略
-- profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- trading_journals
CREATE POLICY "Users can manage own journals" ON trading_journals FOR ALL USING (auth.uid() = user_id);

-- subscriptions
CREATE POLICY "Users can manage own subscription" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- trading_accounts
CREATE POLICY "Users can manage own accounts" ON trading_accounts FOR ALL USING (auth.uid() = user_id);

-- trades
CREATE POLICY "Users can manage own trades" ON trades FOR ALL USING (auth.uid() = user_id);

-- strategies
CREATE POLICY "Users can manage own strategies" ON strategies FOR ALL USING (auth.uid() = user_id);

-- user_settings
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- tracker_rules
CREATE POLICY "Users can manage own tracker rules" ON tracker_rules FOR ALL USING (auth.uid() = user_id);

-- daily_plans
CREATE POLICY "Users can manage own daily plans" ON daily_plans FOR ALL USING (auth.uid() = user_id);

-- emotion_logs
CREATE POLICY "Users can manage own emotion logs" ON emotion_logs FOR ALL USING (auth.uid() = user_id);

-- weekly_goals
CREATE POLICY "Users can manage own weekly goals" ON weekly_goals FOR ALL USING (auth.uid() = user_id);

-- discipline_rules
CREATE POLICY "Users can manage own discipline rules" ON discipline_rules FOR ALL USING (auth.uid() = user_id);

-- daily_discipline_records
CREATE POLICY "Users can manage own discipline records" ON daily_discipline_records FOR ALL USING (auth.uid() = user_id);

-- checklist_items
CREATE POLICY "Users can manage own checklist items" ON checklist_items FOR ALL USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- exchange_connections
CREATE POLICY "Users can manage own exchange connections" ON exchange_connections FOR ALL USING (auth.uid() = user_id);
