-- Add country column to detailers for international support
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS country VARCHAR(2);
