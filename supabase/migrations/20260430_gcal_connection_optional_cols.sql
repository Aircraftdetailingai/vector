-- google_calendar_connections gained two columns that
-- /api/google-calendar/save-oauth and /api/google-calendar/status read but
-- 20260318_scheduling_integration.sql never declared. Without them the
-- status SELECT errors out and the entire connection check silently reports
-- "not connected" — the connection row exists but the UI says it doesn't,
-- so Brett sees zero feedback after a successful OAuth round-trip.

ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS google_email TEXT;

ALTER TABLE google_calendar_connections
  ADD COLUMN IF NOT EXISTS calendars JSONB;
