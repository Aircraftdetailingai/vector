-- Migration to add pricing breakdown and efficiency columns
-- Run this in your Supabase SQL editor

-- ============================================
-- QUOTES TABLE UPDATES
-- ============================================

-- Add line_items column (JSONB array of service line items)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- Add labor_total column
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS labor_total DECIMAL(10,2) DEFAULT 0;

-- Add products_total column
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS products_total DECIMAL(10,2) DEFAULT 0;

-- Add aircraft reference and surface area
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS aircraft_id INTEGER REFERENCES aircraft(id);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS surface_area_sqft INTEGER;

-- Add base hours (before adjustments)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS base_hours DECIMAL(10,2) DEFAULT 0;

-- Add efficiency and difficulty multipliers
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS efficiency_factor DECIMAL(4,2) DEFAULT 1.0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS access_difficulty DECIMAL(4,2) DEFAULT 1.0;

-- Add comments explaining the structure
COMMENT ON COLUMN quotes.line_items IS 'Array of {service, description, hours, rate, amount} objects for full breakdown display';
COMMENT ON COLUMN quotes.labor_total IS 'Labor portion of quote total for labor+products display';
COMMENT ON COLUMN quotes.products_total IS 'Products/materials portion of quote total for labor+products display';
COMMENT ON COLUMN quotes.base_hours IS 'Hours before efficiency and difficulty adjustments';
COMMENT ON COLUMN quotes.efficiency_factor IS 'Detailer speed multiplier (0.5-1.5)';
COMMENT ON COLUMN quotes.access_difficulty IS 'Job access difficulty multiplier (1.0-1.5)';

-- ============================================
-- DETAILERS TABLE UPDATES
-- ============================================

-- Add efficiency factor setting
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS efficiency_factor DECIMAL(4,2) DEFAULT 1.0;

-- Add comment
COMMENT ON COLUMN detailers.efficiency_factor IS 'Detailer team speed multiplier (0.5=fast, 1.0=standard, 1.5=slower)';
