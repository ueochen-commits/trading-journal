-- Prepared only: apply and verify as part of the next billing release, never alongside the old callback.
alter table public.subscriptions add column billing_policy text not null default 'legacy'
  check (billing_policy in ('legacy','2026-10-v2'));

-- Keep historical paid entitlements; new domestic purchases get their own entitlement row.
-- Both entitlement creation and order acknowledgement commit together. Provider callback signature
-- is verified by the server before invoking this service-only function.
create function public.apply_xorpay_payment(p_order_id uuid, p_trade_no text, p_amount numeric, p_paid_at timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare o public.payment_orders; sid uuid; deadline timestamptz; policy text; last_end timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_trade_no,3943));
  select * into strict o from public.payment_orders where id=p_order_id for update;
  perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,3942));
  if p_trade_no is null or p_paid_at is null or not isfinite(p_paid_at) or p_amount is null or p_amount<>o.amount or o.currency is distinct from 'CNY' then raise exception 'invalid_payment'; end if;
  if exists(select 1 from public.subscriptions where id=o.subscription_id and user_id=o.user_id and xorpay_trade_no=p_trade_no and payment_status='paid') then return; end if;
  if o.xorpay_trade_no is not null and o.xorpay_trade_no<>p_trade_no then raise exception 'transaction_mismatch'; end if;
  if exists(select 1 from public.payment_orders where id<>o.id and xorpay_trade_no=p_trade_no) then raise exception 'transaction_reused'; end if;
  if o.payment_status not in ('pending','paid') then raise exception 'invalid_order_state'; end if;
  policy := case
    when (o.plan,o.billing_cycle,o.amount) in (('pro','monthly',29),('pro','yearly',290),('elite','monthly',69),('elite','yearly',690)) then '2026-10-v2'
    when (o.plan,o.billing_cycle,o.amount) in (('pro','yearly',199),('elite','monthly',79),('elite','yearly',599),('elite','lifetime',1999),('lifetime','lifetime',1999)) then 'legacy'
    else null end;
  if policy is null then raise exception 'invalid_plan_amount'; end if;
  select max(current_period_end) into last_end from public.billing_entitlements where user_id=o.user_id and plan=case when o.plan='lifetime' then 'elite' else o.plan end;
  deadline := greatest(now(),coalesce(last_end,now())) + case o.billing_cycle when 'monthly' then interval '1 month' when 'yearly' then interval '1 year' else interval '100 years' end;
  insert into public.subscriptions(user_id,plan,status,current_period_end,payment_method,payment_status,amount,currency,xorpay_order_id,xorpay_trade_no,paid_at,billing_policy)
    values(o.user_id,case when o.plan='lifetime' then 'elite' else o.plan end,'active',deadline,o.payment_method,'paid',o.amount,o.currency,o.xorpay_order_id,p_trade_no,p_paid_at,policy) returning id into sid;
  update public.payment_orders set payment_status='paid',paid_at=p_paid_at,xorpay_trade_no=p_trade_no,subscription_id=sid where id=o.id;
end;
$$;
revoke all on function public.apply_xorpay_payment(uuid,text,numeric,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_xorpay_payment(uuid,text,numeric,timestamptz) to service_role;

create or replace function public.consume_ai_quota(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare chosen text; daily_limit integer; monthly_limit integer; used integer; month_used integer;
  today date := (now() at time zone 'UTC')::date; legacy_plan text;
begin
  -- Same lock for every date and all AI endpoints: the UTC-month boundary cannot race.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,6547));
  select plan into chosen from public.billing_entitlements where user_id=p_user_id
    order by case plan when 'elite' then 3 when 'pro' then 2 else 1 end desc limit 1;
  select plan into legacy_plan from public.subscriptions where user_id=p_user_id and billing_policy='legacy' and status='active'
    and plan in ('pro','elite') and (current_period_end is null or current_period_end>now())
    order by case plan when 'elite' then 3 else 2 end desc limit 1;
  daily_limit := case coalesce(chosen,'free') when 'elite' then 60 when 'pro' then 30 else 5 end;
  monthly_limit := case coalesce(chosen,'free') when 'elite' then 600 when 'pro' then 300 else 30 end;
  if legacy_plan='elite' then daily_limit:=null; monthly_limit:=null;
  elsif legacy_plan='pro' then daily_limit:=greatest(daily_limit,100); monthly_limit:=null; end if;
  select count into used from public.ai_usage where user_id=p_user_id and date=today;
  select coalesce(sum(count),0) into month_used from public.ai_usage where user_id=p_user_id and date>=date_trunc('month',today::timestamp)::date and date<=today;
  if (daily_limit is not null and coalesce(used,0)>=daily_limit) or (monthly_limit is not null and month_used>=monthly_limit) then
    return jsonb_build_object('allowed',false,'daily_limit',daily_limit,'monthly_limit',monthly_limit);
  end if;
  insert into public.ai_usage(user_id,date,count) values(p_user_id,today,1) on conflict(user_id,date) do update set count=public.ai_usage.count+1;
  return jsonb_build_object('allowed',true,'daily_limit',daily_limit,'monthly_limit',monthly_limit);
end;
$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;
