ALTER TABLE user_settings ADD COLUMN language TEXT DEFAULT 'en'
  CHECK (language IN ('en', 'id'));