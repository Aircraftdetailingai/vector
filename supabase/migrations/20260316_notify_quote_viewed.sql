-- Add notify_quote_viewed setting to detailers table (opt-in, default false)
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS notify_quote_viewed BOOLEAN DEFAULT false;
