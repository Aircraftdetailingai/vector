ALTER TABLE detailers ADD COLUMN IF NOT EXISTS portal_theme TEXT DEFAULT 'dark';
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS disclaimer_text TEXT;
