-- =============================================================
-- 限定免费 Pro 试用窗口
-- - 仅在 2026-04-01 ~ 2026-05-31（UTC）之间为新用户创建 30 天 Pro
-- - 其他时间注册的用户直接维持 free，除非后续人工发放
-- =============================================================

DO $$
BEGIN
  -- 删除旧触发器与函数，避免重复定义
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_subscription'
  ) THEN
    DROP TRIGGER on_auth_user_created_subscription ON auth.users;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user_subscription'
  ) THEN
    DROP FUNCTION public.handle_new_user_subscription();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger AS $$
DECLARE
  trial_start CONSTANT timestamptz := TIMESTAMPTZ '2026-04-01 00:00:00+00';
  trial_end   CONSTANT timestamptz := TIMESTAMPTZ '2026-05-31 23:59:59+00';
BEGIN
  IF NEW.created_at BETWEEN trial_start AND trial_end THEN
    INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
    VALUES (
      NEW.id,
      'pro',
      'active',
      NEW.created_at + INTERVAL '30 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();
