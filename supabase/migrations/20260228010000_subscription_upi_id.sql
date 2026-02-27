-- Add upi_id column to subscription_settings table
ALTER TABLE subscription_settings ADD COLUMN IF NOT EXISTS upi_id TEXT DEFAULT 'kevinjeevus@okaxis';
