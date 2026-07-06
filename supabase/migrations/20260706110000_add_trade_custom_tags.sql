-- Persist per-trade tag selections used by the review page.
ALTER TABLE trading_journals
ADD COLUMN IF NOT EXISTS custom_tags jsonb DEFAULT '{}'::jsonb;
