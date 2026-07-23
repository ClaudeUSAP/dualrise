-- Add 'archived' as a valid status for athletes
COMMENT ON COLUMN athletes.status IS 'Valid values: new, available, transfer, committed, archived';