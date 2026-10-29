REVOKE ALL ON public.exchange_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, user_id, exchange, is_active, last_sync, created_at, label, account_type, skip_spot, start_date) ON public.exchange_connections TO authenticated;
GRANT DELETE ON public.exchange_connections TO authenticated;
COMMENT ON TABLE public.exchange_connections IS 'Legacy exchange links: browser access is metadata-only under owner RLS; API linking and sync are paused. Credential fields are service-role-only.';
