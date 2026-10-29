-- Run together with the unapplied migration inside BEGIN/ROLLBACK for a dry run.
-- For an installed schema, BEGIN; this file; ROLLBACK. Never commit fixtures.
do $$
declare u uuid; a jsonb; b jsonb; snap jsonb; checked boolean; original_count bigint; used integer;
begin
  select id into strict u from auth.users limit 1;
  select count(*) into original_count from public.subscriptions;
  a := public.reserve_creem_checkout(u,'test','prod_sql_fixture','pro','monthly');
  assert (a->>'is_new')::boolean, 'first reservation';
  b := public.reserve_creem_checkout(u,'test','prod_sql_fixture','pro','monthly');
  assert a->>'id'=b->>'id' and not (b->>'is_new')::boolean, 'duplicate checkout lock';
  snap := jsonb_build_object('subscription_id','sub_sql_fixture','customer_id','cust_sql_fixture','product_id','prod_sql_fixture',
    'mode','test','plan','pro','status','active','current_period_end',now()+interval '30 days',
    'provider_updated_at',now(),'last_transaction_id','txn_sql_current','access_allowed',true);
  perform public.sync_creem_membership('evt_sql_paid','subscription.paid',(a->>'id')::uuid,snap);
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert checked, 'paid membership';
  perform public.sync_creem_membership('evt_sql_paid','subscription.paid',(a->>'id')::uuid,snap||'{"access_allowed":false}');
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert checked, 'event idempotency';
  perform public.sync_creem_membership('evt_sql_old','subscription.update',(a->>'id')::uuid,snap||jsonb_build_object('provider_updated_at',now()-interval '1 day','access_allowed',false));
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert checked, 'stale snapshot ignored';
  perform public.sync_creem_membership('evt_sql_refund_old','refund.created',(a->>'id')::uuid,snap,'txn_sql_old');
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert checked, 'old refund preserves current paid period';
  perform public.sync_creem_membership('evt_sql_refund','refund.created',(a->>'id')::uuid,snap,'txn_sql_current');
  perform public.sync_creem_membership('evt_sql_replayed','subscription.active',(a->>'id')::uuid,snap);
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert not checked, 'refund block survives active replay';
  perform public.sync_creem_membership('evt_sql_renewal','subscription.paid',(a->>'id')::uuid,snap||jsonb_build_object('provider_updated_at',now()+interval '1 day','last_transaction_id','txn_sql_new'));
  select access_allowed into checked from public.creem_memberships where mode='test' and subscription_id='sub_sql_fixture';
  assert checked, 'new paid transaction restores access';
  assert (select count(*) from public.subscriptions)=original_count, 'legacy subscriptions unchanged';
  assert not exists(select 1 from public.billing_entitlements where user_id=u and current_period_end=now()+interval '30 days'), 'test membership cannot grant live entitlement';
  assert not has_table_privilege('authenticated','public.creem_memberships','INSERT'), 'no client membership insert';
  assert not has_table_privilege('authenticated','public.creem_memberships','UPDATE'), 'no client membership update';
  assert not has_table_privilege('authenticated','public.creem_memberships','DELETE'), 'no client membership delete';
  assert not has_table_privilege('anon','public.creem_memberships','SELECT'), 'anonymous denied';
  assert not has_table_privilege('authenticated','public.subscriptions','UPDATE'), 'legacy entitlement writes denied';
  assert not has_table_privilege('authenticated','public.ai_usage','UPDATE'), 'quota reset denied';
  assert not has_function_privilege('authenticated','public.consume_ai_quota(uuid)','EXECUTE'), 'quota RPC private';
  update public.ai_usage set count=0 where user_id=u and date=(now() at time zone 'UTC')::date;
  -- A fixed quota check uses a transaction-only Free identity with no entitlement changes.
  if not exists(select 1 from public.billing_entitlements where user_id=u) then
    for used in 1..5 loop assert (public.consume_ai_quota(u)->>'allowed')::boolean, 'free quota allowed'; end loop;
    assert not (public.consume_ai_quota(u)->>'allowed')::boolean, 'sixth request denied';
  end if;
  assert not has_function_privilege('authenticated','public.sync_creem_membership(text,text,uuid,jsonb,text)','EXECUTE'), 'RPC not callable by client';
  assert not has_function_privilege('anon','public.reserve_creem_checkout(uuid,text,text,text,text)','EXECUTE'), 'RPC not callable anonymously';
  perform set_config('request.jwt.claim.sub',u::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  perform set_config('tradegrail.test_user',u::text,true);
end;
$$;
set local role authenticated;
do $$
begin
  assert exists(select 1 from public.creem_memberships where subscription_id='sub_sql_fixture'), 'owner can read';
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
  assert not exists(select 1 from public.creem_memberships where subscription_id='sub_sql_fixture'), 'another user cannot read';
end;
$$;
reset role;
