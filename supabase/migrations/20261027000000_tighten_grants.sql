-- Hygiene found by comparing with production (2026-10-25): anon and authenticated
-- hold TRUNCATE, REFERENCES and TRIGGER on every public table. PostgREST does not
-- expose TRUNCATE, but the privileges are unnecessary on the tables that hold
-- money and codes. SELECT/INSERT/UPDATE/DELETE are handled by the ledger and
-- promo migrations; documents and shares are intentionally left alone here.
revoke truncate, references, trigger on
  public.credits, public.transactions, public.promo_codes, public.promo_redemptions
from anon, authenticated;
