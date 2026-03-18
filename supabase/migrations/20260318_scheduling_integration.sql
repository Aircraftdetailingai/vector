-- Scheduling Integration System
-- Calendly, Google Calendar, Team Scheduler, Manager Dashboard

-- 1. Calendly integration columns on detailers
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS calendly_url VARCHAR(500);
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS use_calendly_scheduling BOOLEAN DEFAULT false;

-- 2. Google Calendar connections
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_token VARCHAR(500),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(detailer_id)
);

-- 3. Cached Google Calendar events
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  google_event_id VARCHAR(500) NOT NULL,
  summary VARCHAR(500),
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'confirmed',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(detailer_id, google_event_id)
);
CREATE INDEX IF NOT EXISTS idx_gcal_events_time ON google_calendar_events(start_time, end_time);

-- 4. Google event tracking on quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(500);

-- 5. Team member enhancements
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- 6. Time entry approval columns
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
