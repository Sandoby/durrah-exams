-- Enable RLS on profiles if not already enabled (it likely is)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if it exists to avoid conflicts (or create if not exists)
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;

-- Create a policy that allows any authenticated user to view all profiles
-- This is necessary because the admin panel uses a client-side password check
-- and the admin user is just a regular authenticated user in Supabase's eyes.
CREATE POLICY "Allow authenticated users to view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);
