-- Fields the jobs form was already sending but the API and table dropped
-- silently. All nullable so existing rows stay valid.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS scheduled_time text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN jobs.scheduled_time IS
  'HH:MM local-time string entered in the job form. Paired with scheduled_date.';
COMMENT ON COLUMN jobs.customer_phone IS
  'Phone captured at job creation when a one-off customer is entered.';
COMMENT ON COLUMN jobs.payment_method IS
  'Payment method selected at job creation: unpaid | cash | check | stripe | other.';
