-- Profitability Tracking Migration
-- Adds category to services and job completion tracking for profitability analysis

-- ============================================
-- UPDATE DETAILER_SERVICES TABLE
-- ============================================

-- Add category field to services
ALTER TABLE detailer_services
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
CHECK (category IN ('exterior', 'interior', 'carpet', 'leather', 'engine', 'specialty', 'general'));

-- Update existing services with appropriate categories
UPDATE detailer_services SET category = 'exterior' WHERE service_key IN ('ext_wash', 'wax', 'polish', 'ceramic');
UPDATE detailer_services SET category = 'interior' WHERE service_key IN ('int_detail');
UPDATE detailer_services SET category = 'leather' WHERE service_key IN ('leather');
UPDATE detailer_services SET category = 'carpet' WHERE service_key IN ('carpet');
UPDATE detailer_services SET category = 'specialty' WHERE service_key IN ('brightwork');

-- ============================================
-- JOB COMPLETIONS TABLE
-- ============================================

-- Track actual job performance for profitability analysis
CREATE TABLE IF NOT EXISTS job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  detailer_id UUID NOT NULL REFERENCES detailers(id) ON DELETE CASCADE,

  -- Job details
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Financials
  revenue DECIMAL(10,2) NOT NULL,        -- What customer paid (from quote.total_price)

  -- Labor tracking
  actual_hours DECIMAL(6,2) NOT NULL,    -- Total hours actually worked
  labor_rate DECIMAL(10,2) NOT NULL,     -- Cost per hour for labor (employee cost)
  labor_cost DECIMAL(10,2) GENERATED ALWAYS AS (actual_hours * labor_rate) STORED,

  -- Product/materials cost
  product_cost DECIMAL(10,2) DEFAULT 0,  -- Cost of products used

  -- Calculated profitability
  profit DECIMAL(10,2) GENERATED ALWAYS AS (revenue - (actual_hours * labor_rate) - COALESCE(product_cost, 0)) STORED,
  margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN revenue > 0
    THEN ((revenue - (actual_hours * labor_rate) - COALESCE(product_cost, 0)) / revenue * 100)
    ELSE 0 END
  ) STORED,

  -- Service breakdown (JSON array of services with actual hours)
  service_breakdown JSONB DEFAULT '[]'::jsonb,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(quote_id) -- One completion per quote
);

-- Indexes for profitability queries
CREATE INDEX IF NOT EXISTS idx_job_completions_detailer ON job_completions(detailer_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_date ON job_completions(detailer_id, completed_at);

-- ============================================
-- DETAILER SETTINGS FOR LABOR RATE
-- ============================================

-- Add default labor rate to detailers (cost per hour for employees)
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS default_labor_rate DECIMAL(10,2) DEFAULT 25.00;

COMMENT ON COLUMN detailers.default_labor_rate IS 'Default hourly cost for labor (employee wages + overhead)';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE job_completions IS 'Tracks actual job performance for profitability analysis';
COMMENT ON COLUMN job_completions.revenue IS 'Amount customer paid (from quote total)';
COMMENT ON COLUMN job_completions.actual_hours IS 'Actual hours worked (may differ from estimate)';
COMMENT ON COLUMN job_completions.labor_rate IS 'Cost per hour for labor at time of completion';
COMMENT ON COLUMN job_completions.product_cost IS 'Total cost of products/materials used';
COMMENT ON COLUMN job_completions.profit IS 'Revenue minus all costs';
COMMENT ON COLUMN job_completions.margin_percent IS 'Profit as percentage of revenue';
COMMENT ON COLUMN job_completions.service_breakdown IS 'JSON array: [{service_key, estimated_hours, actual_hours}]';
