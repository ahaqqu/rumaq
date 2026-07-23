-- Index for purchase history queries: filter by household, order by date, filter by store
CREATE INDEX IF NOT EXISTS idx_purchases_household_date_store ON purchases(household_id, date, store_id);