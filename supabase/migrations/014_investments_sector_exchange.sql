-- Sector and exchange metadata for investment positions:
--   sector   – industry/sector tag (e.g. Technology, Finance, Energy)
--   exchange – trading venue (NASDAQ, NYSE, TASE, CRYPTO, etc.)

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS sector   TEXT,
  ADD COLUMN IF NOT EXISTS exchange TEXT;
