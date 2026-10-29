// Run against an isolated in-memory PostgreSQL (PGlite), never production.
// npm install --prefix /tmp/tradegrail-billing-pg-qa @electric-sql/pglite@0.5.13
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '/tmp/tradegrail-billing-pg-qa/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite();
try {
 await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create table subscriptions(id uuid default gen_random_uuid() primary key,user_id uuid,plan text,status text,current_period_end timestamptz,payment_method text,payment_status text,amount numeric,currency text,xorpay_order_id text,xorpay_trade_no text,paid_at timestamptz);
 create table payment_orders(id uuid primary key,user_id uuid,subscription_id uuid references subscriptions(id),plan text,billing_cycle text,amount numeric,currency text,payment_status text,xorpay_order_id text,xorpay_trade_no text,payment_method text,paid_at timestamptz);
 create table creem_memberships(user_id uuid,plan text,mode text,access_allowed boolean,current_period_end timestamptz);
 create table ai_usage(user_id uuid,date date,count integer,primary key(user_id,date));
 create view billing_entitlements as select user_id,plan,current_period_end from subscriptions where status='active' and(current_period_end is null or current_period_end>now()) union all select user_id,plan,current_period_end from creem_memberships where mode='prod' and access_allowed and current_period_end>now();
 `);
 await db.exec(await readFile(new URL('../supabase/migrations/20261029040343_launch_billing_policy.sql',import.meta.url),'utf8'));
 await db.exec(`do $$
 declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); o2 uuid:=gen_random_uuid(); chosen uuid; deadline timestamptz; today date:=(now() at time zone 'UTC')::date; r jsonb; initial_count integer;
 begin
  assert not has_function_privilege('authenticated','apply_xorpay_payment(uuid,text,numeric,timestamptz)','EXECUTE'),'client cannot grant membership';
  assert not has_function_privilege('authenticated','consume_ai_quota(uuid)','EXECUTE'),'client cannot reset quota';
  for i in 1..5 loop r:=consume_ai_quota(u); assert (r->>'allowed')::boolean,'free daily allowed'; end loop;
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'free daily cap';
  update ai_usage set count=30 where user_id=u;
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'free monthly cap';
  delete from ai_usage where user_id=u;
  insert into payment_orders(id,user_id,plan,billing_cycle,amount,currency,payment_status,payment_method) values(o,u,'pro','monthly',29,'CNY','pending','alipay');
  begin perform apply_xorpay_payment(o,'qa_wrong',1,now()); raise exception 'expected rejection'; exception when others then assert sqlerrm='invalid_payment','amount tampering rejected'; end;
  assert not exists(select 1 from subscriptions where user_id=u),'invalid payment no entitlement';
  perform apply_xorpay_payment(o,'qa_paid',29,now());
  select subscription_id into chosen from payment_orders where id=o;
  select current_period_end into deadline from subscriptions where id=chosen;
  assert (select billing_policy='2026-10-v2' from subscriptions where id=chosen),'new paid policy';
  perform apply_xorpay_payment(o,'qa_paid',29,now());
  assert (select count(*)=1 from subscriptions where user_id=u),'duplicate callback cannot add entitlement';
  insert into payment_orders(id,user_id,plan,billing_cycle,amount,currency,payment_status,payment_method) values(o2,u,'pro','monthly',29,'CNY','pending','wechat');
  begin perform apply_xorpay_payment(o2,'qa_paid',29,now()); raise exception 'expected rejection'; exception when others then assert sqlerrm='transaction_reused','transaction cannot pay two orders'; end;
  perform apply_xorpay_payment(o2,'qa_second',29,now());
  assert (select current_period_end>deadline from subscriptions where id=(select subscription_id from payment_orders where id=o2)),'renewal extends already-paid time';
  assert (select count(*)=2 from subscriptions where user_id=u),'existing purchased entitlement retained';
  insert into ai_usage values(u,today,29);
  assert (consume_ai_quota(u)->>'allowed')::boolean,'pro 30th request allowed';
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'pro daily cap';
  update ai_usage set count=300 where user_id=u;
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'pro monthly cap';
  update ai_usage set count=99 where user_id=u;
  insert into subscriptions(user_id,plan,status,current_period_end,billing_policy) values(u,'pro','active',now()+interval '1 day','legacy');
  assert (consume_ai_quota(u)->>'allowed')::boolean,'legacy Pro retains 100/day';
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'legacy Pro daily cap';
  insert into subscriptions(user_id,plan,status,current_period_end,billing_policy) values(u,'elite','active',now()+interval '1 day','legacy');
  update ai_usage set count=5000 where user_id=u;
  assert (consume_ai_quota(u)->>'allowed')::boolean,'legacy Elite retains purchased unlimited quota';
  delete from subscriptions where user_id=u and billing_policy='legacy';
  insert into creem_memberships values(u,'elite','test',true,now()+interval '1 day');
  update ai_usage set count=31 where user_id=u;
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'sandbox Elite cannot increase real Pro quota';
  insert into creem_memberships values(u,'elite','prod',true,now()+interval '1 day');
  update ai_usage set count=59 where user_id=u;
  assert (consume_ai_quota(u)->>'allowed')::boolean,'paid Elite request 60';
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'Elite daily cap';
  update ai_usage set count=600 where user_id=u;
  assert not (consume_ai_quota(u)->>'allowed')::boolean,'Elite monthly cap';
  delete from ai_usage where user_id=u;
  insert into ai_usage values(u,today-interval '40 days',600);
  assert (consume_ai_quota(u)->>'allowed')::boolean,'previous month usage does not consume new month';
 end $$;`);
 // Force acknowledgement failure after subscription INSERT; both must roll back.
 await db.exec(`create function fail_paid_fixture() returns trigger language plpgsql as $$begin if new.payment_status='paid' then raise exception 'fixture_ack_failed'; end if; return new; end$$;
 create trigger fail_paid_fixture before update on payment_orders for each row execute function fail_paid_fixture();
 do $$declare u uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); begin
 insert into payment_orders(id,user_id,plan,billing_cycle,amount,currency,payment_status,payment_method) values(o,u,'elite','yearly',690,'CNY','pending','wechat');
 begin perform apply_xorpay_payment(o,'qa_rollback',690,now()); exception when others then assert sqlerrm='fixture_ack_failed','injected acknowledgement failure'; end;
 assert not exists(select 1 from subscriptions where user_id=u),'failure rolls back entitlement';
 assert (select payment_status='pending' from payment_orders where id=o),'failure leaves retryable order';
 end$$;`);
 console.log('PASS: isolated PostgreSQL syntax, callback atomicity/idempotency, renewal time, new daily/monthly AI quotas, legacy entitlements, sandbox isolation and service-only grants.');
} finally { await db.close(); }
