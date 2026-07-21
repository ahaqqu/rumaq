-- Index for listing plans by household + status (e.g. active plan lookup)
CREATE INDEX IF NOT EXISTS idx_plans_household_status ON plans(household_id, status);
