-- 1. Enable RLS on tables (standard practice, ensures policies are active)
ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."submission_answers" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
-- We drop potential previous names to be safe
DROP POLICY IF EXISTS "Enable insert for all" ON "public"."submissions";
DROP POLICY IF EXISTS "Enable insert for all" ON "public"."submission_answers";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."submissions";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."submission_answers";
DROP POLICY IF EXISTS "Public submissions" ON "public"."submissions";
DROP POLICY IF EXISTS "Public answers" ON "public"."submission_answers";

-- 3. Create PERMISSIVE policies for INSERT
-- This allows ANYONE (including anonymous mobile users) to insert a row
CREATE POLICY "Enable insert for all" ON "public"."submissions" FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all" ON "public"."submission_answers" FOR INSERT WITH CHECK (true);

-- 4. Create PERMISSIVE policies for SELECT
-- This is useful for debugging so the client can read back what it just submitted
CREATE POLICY "Enable read access for all users" ON "public"."submissions" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."submission_answers" FOR SELECT USING (true);

-- 5. Grant necessary permissions to the 'anon' and 'authenticated' roles
-- This is the database-level permission that sits above RLS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE "public"."submissions" TO anon, authenticated;
GRANT ALL ON TABLE "public"."submission_answers" TO anon, authenticated;

-- 6. Ensure sequences are accessible (if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
