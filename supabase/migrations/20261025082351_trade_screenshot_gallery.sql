-- Keep the first URL for older clients and imports; new clients read the gallery.
alter table public.trading_journals add column screenshot_urls text[];
comment on column public.trading_journals.screenshot_urls is 'Ordered screenshot gallery; NULL falls back to legacy screenshot_url, empty array means no screenshots.';

create function public.validate_trade_screenshot_gallery()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.screenshot_urls is not null then
    -- Existing paid galleries remain readable/editable after a downgrade.
    if tg_op = 'INSERT' or new.screenshot_urls is distinct from old.screenshot_urls then
      if pg_catalog.cardinality(new.screenshot_urls) > 2 and not exists (
        select 1 from public.subscriptions
        where user_id = new.user_id and plan in ('pro', 'elite') and status = 'active'
          and (current_period_end is null or current_period_end > pg_catalog.now())
      ) then
        raise exception 'Free accounts allow at most 2 screenshots per trade' using errcode = '23514';
      end if;
    end if;
    new.screenshot_url := new.screenshot_urls[1];
  end if;
  return new;
end;
$$;
revoke execute on function public.validate_trade_screenshot_gallery() from public, anon, authenticated;
create trigger validate_trade_screenshot_gallery
before insert or update of screenshot_urls on public.trading_journals
for each row execute function public.validate_trade_screenshot_gallery();
