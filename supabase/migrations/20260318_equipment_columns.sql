-- Add missing columns to equipment table to match API expectations
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS warranty_expiry DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS maintenance_notes TEXT DEFAULT '';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS jobs_completed INTEGER DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Migrate data from old column names
UPDATE equipment SET purchase_price = cost WHERE cost IS NOT NULL AND (purchase_price IS NULL OR purchase_price = 0);
UPDATE equipment SET warranty_expiry = warranty_expiration WHERE warranty_expiration IS NOT NULL AND warranty_expiry IS NULL;
