-- =============================================================
-- 会员体系初始化 Migration
-- 目标：
--   1. 所有现有用户 → Pro，有效期 = 注册时间 + 3 个月
--   2. 新用户注册后 → 自动获得 30 天 Pro 试用
-- 执行环境：Supabase SQL Editor（postgres 角色，绕过 RLS）
-- =============================================================

-- ---------------------------------------------------------------
-- Step 1: 更新现有用户的 profiles.tier 为 'pro'
--         只更新 'free'，不覆盖已有 'elite' 等更高权限
-- ---------------------------------------------------------------
UPDATE profiles
SET
  tier = 'pro',
  updated_at = now()
WHERE tier = 'free';

-- ---------------------------------------------------------------
-- Step 2: 为还没有订阅记录的现有用户批量插入 Pro 订阅
--         current_period_end = 用户注册时间 + 3 个月
-- ---------------------------------------------------------------
INSERT INTO subscriptions (user_id, plan, status, current_period_end)
SELECT
  u.id,
  'pro',
  'active',
  u.created_at + INTERVAL '3 months'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
);

-- ---------------------------------------------------------------
-- Step 3: 更新已有订阅记录中 plan = 'free' 的用户到 Pro
--         不覆盖 'pro' / 'elite' 的现有记录
-- ---------------------------------------------------------------
UPDATE subscriptions s
SET
  plan = 'pro',
  status = 'active',
  current_period_end = u.created_at + INTERVAL '3 months'
FROM auth.users u
WHERE s.user_id = u.id
  AND s.plan = 'free';

-- ---------------------------------------------------------------
-- Step 4: 新用户注册触发器
--         每当有新用户在 auth.users 创建时，
--         自动在 subscriptions 插入 30 天 Pro 试用记录
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (
    NEW.id,
    'pro',
    'active',
    NEW.created_at + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 先删除旧触发器（如已存在），再重建，保证幂等
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
