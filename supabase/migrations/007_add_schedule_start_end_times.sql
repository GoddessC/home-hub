-- Add start_time and end_time columns to schedule_items table
ALTER TABLE schedule_items 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Add start_time and end_time columns to schedule_template_items table  
ALTER TABLE schedule_template_items
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Update existing records to use time as start_time and calculate end_time
-- For now, we'll set end_time to 1 hour after start_time for existing records
UPDATE schedule_items 
SET start_time = time::TIME,
    end_time = (time::TIME + INTERVAL '1 hour')::TIME
WHERE time IS NOT NULL;

UPDATE schedule_template_items
SET start_time = time::TIME,
    end_time = (time::TIME + INTERVAL '1 hour')::TIME  
WHERE time IS NOT NULL;

-- Make start_time and end_time NOT NULL after populating them
ALTER TABLE schedule_items 
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

ALTER TABLE schedule_template_items
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Add check constraint to ensure end_time is after start_time
ALTER TABLE schedule_items 
ADD CONSTRAINT check_schedule_times CHECK (end_time > start_time);

ALTER TABLE schedule_template_items
ADD CONSTRAINT check_template_times CHECK (end_time > start_time);
