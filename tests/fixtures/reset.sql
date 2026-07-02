-- Truncate all tables in FK-safe order (child tables first)

DELETE FROM plan_items;
DELETE FROM plans;
DELETE FROM purchase_items;
DELETE FROM purchases;
DELETE FROM ai_usage;
DELETE FROM user_settings;
DELETE FROM stock;
DELETE FROM items;
DELETE FROM household_members;
DELETE FROM stores;
DELETE FROM locations;
DELETE FROM households;
DELETE FROM users;
