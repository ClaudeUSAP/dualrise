-- Add transfer-specific fields for athletes with transfer status
ALTER TABLE athletes ADD COLUMN transfer_individual_ranking text;
ALTER TABLE athletes ADD COLUMN transfer_from_school text;
ALTER TABLE athletes ADD COLUMN transfer_from_division text;

COMMENT ON COLUMN athletes.transfer_individual_ranking IS 'Individual ranking at current/previous school (e.g., #2, Top 5)';
COMMENT ON COLUMN athletes.transfer_from_school IS 'School the athlete is transferring from';
COMMENT ON COLUMN athletes.transfer_from_division IS 'NCAA division of the school transferring from (NCAA D1/D2/D3, NAIA, NJCAA)';