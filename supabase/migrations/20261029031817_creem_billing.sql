-- Creem billing is isolated by environment and never overwrites trial/legacy subscriptions.
create table public.creem_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('test','prod')),
  product_id text not null,
  plan text not null check (plan in ('pro','elite')),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  checkout_id text,
  checkout_url text,
  state text not null default 'pending' check (state in ('pending','unknown','completed','expired')),
  created_at timestamptz not null default now(),
  unique (mode,checkout_id)
);
create index creem_checkouts_user_mode on public.creem_checkouts(user_id,mode);
create table public.creem_memberships (
  subscription_id text not null,
  mode text not null check (mode in ('test','prod')),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkout_id uuid not null references public.creem_checkouts(id),
  customer_id text not null,
  product_id text not null,
  plan text not null check (plan in ('pro','elite')),
  status text not null,
  current_period_end timestamptz not null,
  provider_updated_at timestamptz not null,
  last_transaction_id text,
  access_allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (mode,subscription_id)
);
create index creem_memberships_user_mode on public.creem_memberships(user_id,mode);
create index creem_memberships_checkout on public.creem_memberships(checkout_id);
create table public.creem_events (
  mode text not null,
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  primary key (mode,event_id)
);
create table public.creem_payment_blocks (
  mode text not null,
  transaction_id text not null,
  reason text not null,
  primary key (mode,transaction_id)
);
alter table public.creem_checkouts enable row level security;
alter table public.creem_memberships enable row level security;
alter table public.creem_events enable row level security;
alter table public.creem_payment_blocks enable row level security;
revoke all on public.creem_checkouts, public.creem_memberships, public.creem_events, public.creem_payment_blocks from public, anon, authenticated;
grant all on public.creem_checkouts, public.creem_memberships, public.creem_events, public.creem_payment_blocks to service_role;
grant select on public.creem_checkouts, public.creem_memberships to authenticated;
create policy "Read own Creem checkout" on public.creem_checkouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own Creem membership" on public.creem_memberships for select to authenticated using ((select auth.uid()) = user_id);

-- Entitlements are server-owned. Preserve existing records and read access.
drop policy if exists "Users can manage own subscription" on public.subscriptions;
create policy "Read own subscription" on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete, truncate, references, trigger on public.subscriptions from public, anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
drop policy if exists "Users can insert own usage" on public.ai_usage;
drop policy if exists "Users can update own usage" on public.ai_usage;
revoke insert,update,delete,truncate,references,trigger on public.ai_usage from public,anon,authenticated;
grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;
alter function public.handle_new_user_subscription() set search_path = '';
revoke execute on function public.handle_new_user_subscription() from public, anon, authenticated;

create function public.reserve_creem_checkout(p_user_id uuid, p_mode text, p_product_id text, p_plan text, p_cycle text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare attempt public.creem_checkouts;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 3942));
  if exists(select 1 from public.creem_memberships where user_id=p_user_id and mode=p_mode and access_allowed and current_period_end>now()) then
    raise exception 'subscription_already_exists';
  end if;
  select * into attempt from public.creem_checkouts where user_id=p_user_id and mode=p_mode and state in ('pending','unknown') order by created_at desc limit 1;
  if found then
    if attempt.product_id <> p_product_id then raise exception 'checkout_already_exists'; end if;
    return to_jsonb(attempt) || '{"is_new":false}'::jsonb;
  end if;
  insert into public.creem_checkouts(user_id,mode,product_id,plan,billing_cycle)
    values(p_user_id,p_mode,p_product_id,p_plan,p_cycle) returning * into attempt;
  return to_jsonb(attempt) || '{"is_new":true}'::jsonb;
end;
$$;

-- One authenticated request consumes one shared quota across all three AI endpoints.
create function public.consume_ai_quota(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare chosen text; daily_limit integer; used integer; today date := (now() at time zone 'UTC')::date;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||today::text,6547));
  select plan into chosen from public.billing_entitlements where user_id=p_user_id
    order by case plan when 'elite' then 3 when 'pro' then 2 else 1 end desc limit 1;
  daily_limit := case coalesce(chosen,'free') when 'elite' then null when 'pro' then 100 else 5 end;
  select count into used from public.ai_usage where user_id=p_user_id and date=today;
  if daily_limit is not null and coalesce(used,0)>=daily_limit then return jsonb_build_object('allowed',false); end if;
  insert into public.ai_usage(user_id,date,count) values(p_user_id,today,1)
    on conflict(user_id,date) do update set count=public.ai_usage.count+1;
  return jsonb_build_object('allowed',true);
end;
$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;
revoke all on function public.reserve_creem_checkout(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_creem_checkout(uuid,text,text,text,text) to service_role;

-- Event acknowledgement, payment block and membership update commit together.
create function public.sync_creem_membership(p_event_id text, p_event_type text, p_checkout_id uuid, p_snapshot jsonb, p_blocked_transaction text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare attempt public.creem_checkouts; permitted boolean;
begin
  select * into strict attempt from public.creem_checkouts where id=p_checkout_id;
  perform pg_advisory_xact_lock(hashtextextended(attempt.user_id::text,3942));
  if attempt.mode <> p_snapshot->>'mode' or attempt.product_id <> p_snapshot->>'product_id' or attempt.plan <> p_snapshot->>'plan' then
    raise exception 'checkout_binding_mismatch';
  end if;
  if exists(select 1 from public.creem_events where mode=attempt.mode and event_id=p_event_id) then return; end if;
  if exists(select 1 from public.creem_memberships where mode=attempt.mode and subscription_id=p_snapshot->>'subscription_id'
    and (user_id<>attempt.user_id or customer_id<>p_snapshot->>'customer_id')) then raise exception 'subscription_owner_mismatch'; end if;
  if p_blocked_transaction is not null then
    insert into public.creem_payment_blocks values(attempt.mode,p_blocked_transaction,p_event_type) on conflict do nothing;
  end if;
  permitted := (p_snapshot->>'access_allowed')::boolean and not exists(
    select 1 from public.creem_payment_blocks where mode=attempt.mode and transaction_id=p_snapshot->>'last_transaction_id'
  );
  insert into public.creem_memberships(subscription_id,mode,user_id,checkout_id,customer_id,product_id,plan,status,current_period_end,provider_updated_at,last_transaction_id,access_allowed)
  values(p_snapshot->>'subscription_id',attempt.mode,attempt.user_id,attempt.id,p_snapshot->>'customer_id',attempt.product_id,attempt.plan,p_snapshot->>'status',
    (p_snapshot->>'current_period_end')::timestamptz,(p_snapshot->>'provider_updated_at')::timestamptz,p_snapshot->>'last_transaction_id',permitted)
  on conflict(mode,subscription_id) do update set
    status=excluded.status,current_period_end=excluded.current_period_end,provider_updated_at=excluded.provider_updated_at,
    last_transaction_id=excluded.last_transaction_id,access_allowed=excluded.access_allowed,updated_at=now()
  where public.creem_memberships.user_id=excluded.user_id and public.creem_memberships.customer_id=excluded.customer_id
    and public.creem_memberships.provider_updated_at<=excluded.provider_updated_at;
  -- Blocks survive an older refund/dispute notification and any subsequent active replay.
  update public.creem_memberships set access_allowed=false where mode=attempt.mode and user_id=attempt.user_id
    and last_transaction_id in (select transaction_id from public.creem_payment_blocks where mode=attempt.mode);
  update public.creem_checkouts set state='completed' where id=attempt.id;
  insert into public.creem_events(mode,event_id,event_type) values(attempt.mode,p_event_id,p_event_type);
end;
$$;
revoke all on function public.sync_creem_membership(text,text,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.sync_creem_membership(text,text,uuid,jsonb,text) to service_role;

create view public.billing_entitlements with (security_invoker=true) as
  select user_id,plan,current_period_end from public.subscriptions
    where status='active' and (current_period_end is null or current_period_end>now())
  union all
  select user_id,plan,current_period_end from public.creem_memberships
    where mode='prod' and access_allowed and current_period_end>now();
revoke all on public.billing_entitlements from public,anon,authenticated;
grant select on public.billing_entitlements to authenticated,service_role;

create or replace function public.validate_trade_screenshot_gallery()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.screenshot_urls is not null then
    if tg_op='INSERT' or new.screenshot_urls is distinct from old.screenshot_urls then
      if pg_catalog.cardinality(new.screenshot_urls)>2 and not exists (
        select 1 from public.billing_entitlements where user_id=new.user_id and plan in ('pro','elite')
      ) then raise exception 'Free accounts allow at most 2 screenshots per trade' using errcode='23514'; end if;
    end if;
    new.screenshot_url := new.screenshot_urls[1];
  end if;
  return new;
end;
$$;
