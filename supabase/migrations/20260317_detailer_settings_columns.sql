-- Add missing detailer settings columns
-- These columns are needed by the /settings page and /api/user/me endpoint

ALTER TABLE detailers ADD COLUMN IF NOT EXISTS home_airport TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS airports_served JSONB DEFAULT '[]'::jsonb;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS cc_fee_mode TEXT DEFAULT 'absorb';
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS pass_fee_to_customer BOOLEAN DEFAULT false;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS followup_discount_percent INTEGER DEFAULT 10;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS default_labor_rate NUMERIC DEFAULT 25;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS font_heading TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS font_subheading TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS font_body TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS font_embed_url TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS onboarding_completed TIMESTAMPTZ;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS terms_accepted_version TEXT;
