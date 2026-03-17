-- Community Hours Averaging v2 - Statistical improvements
-- 1. Add status column to hours_contributions for outlier flagging
-- 2. Add unique_detailers and weighted_avg to hours_update_log

-- Add status column: 'accepted', 'rejected', 'outlier', or NULL (pending)
ALTER TABLE hours_contributions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT NULL;

-- Backfill status from accepted boolean
UPDATE hours_contributions SET status = 'accepted' WHERE accepted = true AND status IS NULL;
UPDATE hours_contributions SET status = 'rejected' WHERE accepted = false AND status IS NULL;

-- Add index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_hours_contributions_status ON hours_contributions (status);
CREATE INDEX IF NOT EXISTS idx_hours_contributions_detailer_hash ON hours_contributions (detailer_hash);

-- Enhance hours_update_log with additional tracking columns
ALTER TABLE hours_update_log ADD COLUMN IF NOT EXISTS unique_detailers INT;
ALTER TABLE hours_update_log ADD COLUMN IF NOT EXISTS weighted_avg DECIMAL(8,2);
