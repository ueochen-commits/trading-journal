-- 用户规则设置表
CREATE TABLE IF NOT EXISTS user_rule_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trading_days text[] DEFAULT ARRAY['Mo','Tu','We','Th','Fr'],
  email_reminder_enabled boolean DEFAULT false,
  email_reminder_time time DEFAULT '20:30',
  trading_hours_enabled boolean DEFAULT false,
  trading_hours_from time DEFAULT '09:00',
  trading_hours_to time DEFAULT '12:00',
  start_my_day_enabled boolean DEFAULT true,
  start_my_day_time time DEFAULT '09:30',
  link_to_playbook_enabled boolean DEFAULT true,
  input_stop_loss_enabled boolean DEFAULT true,
  net_max_loss_per_trade_enabled boolean DEFAULT true,
  net_max_loss_per_trade_type text DEFAULT '$',
  net_max_loss_per_trade_value numeric DEFAULT 100,
  net_max_loss_per_day_enabled boolean DEFAULT true,
  net_max_loss_per_day_value numeric DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 手动规则表
CREATE TABLE IF NOT EXISTS manual_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  active_days text[] DEFAULT ARRAY['Mo','Tu','We','Th','Fr'],
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 规则每日执行记录表（用于热力图和统计）
CREATE TABLE IF NOT EXISTS rule_execution_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  total_rules integer NOT NULL DEFAULT 0,
  completed_rules integer NOT NULL DEFAULT 0,
  completion_rate numeric GENERATED ALWAYS AS (
    CASE WHEN total_rules > 0 THEN completed_rules::numeric / total_rules ELSE 0 END
  ) STORED,
  rule_results jsonb DEFAULT '{}', -- { "start_my_day": true, "link_playbook": false, ... }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS policies
ALTER TABLE user_rule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own rule settings"
  ON user_rule_settings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own manual rules"
  ON manual_rules FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own execution logs"
  ON rule_execution_logs FOR ALL USING (auth.uid() = user_id);
