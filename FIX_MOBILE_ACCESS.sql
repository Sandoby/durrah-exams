-- Allow anyone to read exams (needed for anonymous access on mobile/safari where sessions might be flaky)
DROP POLICY IF EXISTS "Anyone can view exams" ON "public"."exams";
CREATE POLICY "Anyone can view exams" ON "public"."exams"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Allow anyone to read questions
DROP POLICY IF EXISTS "Anyone can view questions" ON "public"."questions";
CREATE POLICY "Anyone can view questions" ON "public"."questions"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Ensure submissions are insertable by anyone (already done, but reinforcing)
DROP POLICY IF EXISTS "Anyone can insert submissions" ON "public"."submissions";
CREATE POLICY "Anyone can insert submissions" ON "public"."submissions"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert submission answers" ON "public"."submission_answers";
CREATE POLICY "Anyone can insert submission answers" ON "public"."submission_answers"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);
