-- Prevent duplicate active invoices per job
-- Drafts are excluded so a draft can be upgraded to sent
-- This is a partial unique index, not a constraint (Postgres supports this)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_invoice_per_job
  ON invoices (job_id, detailer_id)
  WHERE status IN ('sent', 'viewed', 'paid');

-- Same for quote-based invoices
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_invoice_per_quote
  ON invoices (quote_id, detailer_id)
  WHERE status IN ('sent', 'viewed', 'paid')
  AND quote_id IS NOT NULL;
