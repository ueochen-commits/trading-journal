-- Serialize first-login initialization across tabs/devices, and identify the
-- system demo by type so editing its name does not create another demo.
create or replace function public.ensure_default_trading_account()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  demo public.trading_accounts%rowtype;
  created boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('tradegrail.demo_account:' || current_user_id::text, 0)
  );

  select * into demo
  from public.trading_accounts
  where user_id = current_user_id and account_type = 'demo'
  order by created_at, id
  limit 1
  for update;

  if not found then
    insert into public.trading_accounts (user_id, name, account_type, balance, currency)
    values (current_user_id, 'Demo Account', 'demo', 10000, 'USD')
    returning * into demo;
    created := true;
  end if;

  -- Preserve the previous migration behavior for legacy unassigned journals.
  update public.trading_journals
  set account_id = demo.id
  where user_id = current_user_id and account_id is null;

  return pg_catalog.jsonb_build_object('account', pg_catalog.to_jsonb(demo), 'is_new', created);
end;
$$;

revoke execute on function public.ensure_default_trading_account() from public, anon;
grant execute on function public.ensure_default_trading_account() to authenticated;
