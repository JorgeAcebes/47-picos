-- Add link column to experience_records
ALTER TABLE experience_records
ADD COLUMN IF NOT EXISTS link TEXT;
