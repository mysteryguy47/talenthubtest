-- Reward System Migration SQL
-- Run these commands on your PostgreSQL database to add the missing columns

-- Add columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS total_questions_attempted INTEGER DEFAULT 0;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_grace_skip_date TIMESTAMP;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS grace_skip_week_start TIMESTAMP;

-- Add column to attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS t_shirt_worn BOOLEAN DEFAULT FALSE;

-- Add columns to rewards table
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS badge_category VARCHAR(50) DEFAULT 'general';

ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT FALSE;

ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS month_earned VARCHAR(7);
