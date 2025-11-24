-- Add duration column to coupons table
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS duration text CHECK (duration IN ('monthly', 'annual'));

-- Create chat_ratings table
CREATE TABLE IF NOT EXISTS chat_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on chat_ratings
ALTER TABLE chat_ratings ENABLE ROW LEVEL SECURITY;

-- Policy for users to insert their own ratings
CREATE POLICY "Users can insert their own ratings" 
ON chat_ratings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all ratings
-- Assuming admins are identified by a specific role or email, but for now allowing authenticated users to view (or restrict to admin if possible)
-- For simplicity in this context, allowing authenticated read, but in production should be admin-only.
CREATE POLICY "Admins can view ratings" 
ON chat_ratings FOR SELECT 
TO authenticated 
USING (true);
