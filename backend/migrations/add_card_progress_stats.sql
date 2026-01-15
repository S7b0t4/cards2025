-- Migration: Add statistics fields to card_progress table
-- This migration adds fields to track answer statistics for improved spaced repetition

-- Add correct_count column
ALTER TABLE card_progress 
ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0;

-- Add incorrect_count column
ALTER TABLE card_progress 
ADD COLUMN IF NOT EXISTS incorrect_count INTEGER NOT NULL DEFAULT 0;

-- Add consecutive_correct column
ALTER TABLE card_progress 
ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER NOT NULL DEFAULT 0;

-- Add consecutive_incorrect column
ALTER TABLE card_progress 
ADD COLUMN IF NOT EXISTS consecutive_incorrect INTEGER NOT NULL DEFAULT 0;

-- Add success_rate column
ALTER TABLE card_progress 
ADD COLUMN IF NOT EXISTS success_rate FLOAT NOT NULL DEFAULT 0;

-- Add comments
COMMENT ON COLUMN card_progress.correct_count IS 'Total number of correct answers';
COMMENT ON COLUMN card_progress.incorrect_count IS 'Total number of incorrect answers';
COMMENT ON COLUMN card_progress.consecutive_correct IS 'Number of consecutive correct answers';
COMMENT ON COLUMN card_progress.consecutive_incorrect IS 'Number of consecutive incorrect answers';
COMMENT ON COLUMN card_progress.success_rate IS 'Success rate (correct / total answers)';
