CREATE INDEX IF NOT EXISTS idx_purchase_items_item_date ON purchase_items(item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_household_item ON stock(household_id, item_id);
