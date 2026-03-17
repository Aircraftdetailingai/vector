-- Add portal_theme column for dark/light customer-facing portal toggle
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS portal_theme TEXT DEFAULT 'dark';
