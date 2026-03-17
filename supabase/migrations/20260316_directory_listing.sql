-- Add directory listing opt-in to detailers table
ALTER TABLE detailers ADD COLUMN IF NOT EXISTS listed_in_directory BOOLEAN DEFAULT false;

-- Partial index for efficient public directory queries
CREATE INDEX IF NOT EXISTS idx_detailers_directory ON detailers(listed_in_directory) WHERE listed_in_directory = true;
