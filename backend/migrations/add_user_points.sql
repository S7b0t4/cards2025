-- Migration: Add points field to users table
-- This migration adds a points/score system for users

-- Add points column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN users.points IS 'User points/score earned from correct answers';
