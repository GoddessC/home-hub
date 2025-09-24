-- Add face items to avatar_items table
-- These are the default face expressions available to all users

-- Insert face items (using only the basic columns that exist)
-- Only insert if they don't already exist
INSERT INTO avatar_items (name, category, asset_url, created_at)
SELECT * FROM (VALUES
('Goofy Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/goofy.png', NOW()),
('Happy Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/happy.png', NOW()),
('Sad Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/sad.png', NOW()),
('Funny Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/funny.png', NOW()),
('Angry Face', 'face', 'https://dvqkkqvjsqjnvwwvxenh.supabase.co/storage/v1/object/public/avatars/faces/angry.png', NOW())
) AS new_items(name, category, asset_url, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM avatar_items 
  WHERE avatar_items.name = new_items.name 
  AND avatar_items.category = new_items.category
);

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
WHERE NOT EXISTS (
  SELECT 1 FROM feeling_face_mapping 
  WHERE feeling_face_mapping.feeling = mappings.feeling
);

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
AND NOT EXISTS (
  SELECT 1 FROM member_avatar_inventory 
  WHERE member_avatar_inventory.member_id = m.id 
  AND member_avatar_inventory.item_id = ai.id
);
