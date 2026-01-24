-- Detailer Services Table
-- Each detailer can customize which services they offer with their own rates

CREATE TABLE IF NOT EXISTS detailer_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,           -- 'ext_wash', 'int_detail', or custom like 'smoke_removal'
  service_name TEXT NOT NULL,          -- Display name: "Exterior Wash & Detail"
  hourly_rate DECIMAL(10,2) NOT NULL,  -- Rate for this specific service
  default_hours DECIMAL(4,2) DEFAULT 1.0, -- Fallback if no aircraft data
  description TEXT,                    -- Optional description for quotes
  requires_return_trip BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT FALSE,     -- true for detailer-created services
  db_field TEXT,                       -- Maps to aircraft table: 'ext_wash_hours', etc.
  enabled BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(detailer_id, service_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_detailer_services_detailer ON detailer_services(detailer_id);
CREATE INDEX IF NOT EXISTS idx_detailer_services_enabled ON detailer_services(detailer_id, enabled);

-- Standard services template (used when creating new detailers)
-- These are the default services a new detailer gets, which they can modify

COMMENT ON TABLE detailer_services IS 'Customizable service menu for each detailer with individual rates and defaults';
COMMENT ON COLUMN detailer_services.service_key IS 'Unique key per detailer, matches aircraft db_field for standard services';
COMMENT ON COLUMN detailer_services.db_field IS 'Maps to aircraft table column (ext_wash_hours, int_detail_hours, etc.)';
COMMENT ON COLUMN detailer_services.is_custom IS 'True for detailer-created services that have no aircraft database mapping';
