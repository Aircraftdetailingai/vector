-- Customer Fleet & Payment Methods for Corporate/Charter Accounts

-- Fleet aircraft managed by customers
CREATE TABLE IF NOT EXISTS customer_fleet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  detailer_id UUID NOT NULL,
  tail_number VARCHAR(20) NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  home_airport VARCHAR(10),
  nickname VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_customer ON customer_fleet(customer_id);
CREATE INDEX IF NOT EXISTS idx_fleet_detailer ON customer_fleet(detailer_id);

-- Stored payment methods (Stripe SetupIntent)
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  detailer_id UUID NOT NULL,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  stripe_customer_id VARCHAR(255),
  type VARCHAR(20) NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  exp_month INT,
  exp_year INT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_customer ON customer_payment_methods(customer_id);

-- Fleet service requests with auto-routing
CREATE TABLE IF NOT EXISTS fleet_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  fleet_aircraft_id UUID NOT NULL,
  detailer_id UUID,
  services JSONB,
  preferred_date DATE,
  location VARCHAR(10),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  routed_to VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fsr_customer ON fleet_service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_fsr_detailer ON fleet_service_requests(detailer_id);
