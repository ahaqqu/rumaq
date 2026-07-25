-- Add language preference to user settings.
ALTER TABLE user_settings ADD COLUMN language TEXT CHECK (language IN ('id', 'en'));

-- Backfill existing rows to the default application language.
UPDATE user_settings SET language = 'id' WHERE language IS NULL;
