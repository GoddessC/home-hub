-- Add face items to avatar_items table
-- These are the default face expressions available to all users

-- First, ensure the avatar_items table exists and has the right structure
DO $$
BEGIN
    -- Check if avatar_items table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'avatar_items') THEN
        CREATE TABLE avatar_items (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            asset_url TEXT,
            point_cost INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Insert face items
INSERT INTO avatar_items (name, category, asset_url, point_cost, is_active, created_at) VALUES
('Goofy Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/goofy.png', 0, true, NOW()),
('Happy Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/happy.png', 0, true, NOW()),
('Sad Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/sad.png', 0, true, NOW()),
('Funny Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/funny.png', 0, true, NOW()),
('Angry Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/angry.png', 0, true, NOW())
ON CONFLICT (name, category) DO NOTHING;

-- Create a mapping table for feelings to face expressions
CREATE TABLE IF NOT EXISTS feeling_face_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feeling TEXT NOT NULL UNIQUE,
  face_item_id UUID REFERENCES avatar_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the feeling to face mappings
INSERT INTO feeling_face_mapping (feeling, face_item_id) 
SELECT 
  feeling,
  ai.id
FROM (VALUES 
  ('joyful', 'Goofy Face'),
  ('happy', 'Happy Face'),
  ('sad', 'Sad Face'),
  ('worried', 'Funny Face'),
  ('angry', 'Angry Face'),
  ('okay', 'Happy Face')
) AS mappings(feeling, face_name)
JOIN avatar_items ai ON ai.name = mappings.face_name AND ai.category = 'face'
ON CONFLICT (feeling) DO NOTHING;

-- Enable RLS on the new table
ALTER TABLE feeling_face_mapping ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for feeling_face_mapping
CREATE POLICY "Anyone can read feeling face mappings" ON feeling_face_mapping
  FOR SELECT USING (true);

-- Give all existing members the face items for free
INSERT INTO member_avatar_inventory (member_id, item_id, purchased_at)
SELECT 
  m.id as member_id,
  ai.id as item_id,
  NOW() as purchased_at
FROM members m
CROSS JOIN avatar_items ai
WHERE ai.category = 'face'
ON CONFLICT (member_id, item_id) DO NOTHING;
