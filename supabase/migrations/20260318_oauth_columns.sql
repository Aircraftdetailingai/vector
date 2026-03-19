-- Social OAuth login support
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS oauth_id TEXT;
