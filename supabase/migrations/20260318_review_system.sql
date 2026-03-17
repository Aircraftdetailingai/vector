-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  detailer_id UUID REFERENCES detailers(id) ON DELETE CASCADE,
  customer_email TEXT,
  customer_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add feedback token columns to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS feedback_token TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ;

-- Add review request settings to detailers
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS review_request_enabled BOOLEAN DEFAULT true;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS review_request_delay_days INTEGER DEFAULT 1;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_detailer_public ON feedback(detailer_id, is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_feedback_quote_id ON feedback(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_feedback_token ON quotes(feedback_token) WHERE feedback_token IS NOT NULL;
