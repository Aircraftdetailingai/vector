-- App-wide settings (key/value store for admin toggles)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default: invite_only matches env var (no row = use env var default)
