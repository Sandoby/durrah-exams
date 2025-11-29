-- Add media support to questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('image', 'audio', 'video'));

-- Create Question Bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tutor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    question_text text NOT NULL,
    type text NOT NULL,
    options jsonb,
    correct_answer text,
    media_url text,
    media_type text,
    tags text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Policies for Question Bank
CREATE POLICY "Tutors can view their own questions" 
ON public.question_bank FOR SELECT 
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can insert their own questions" 
ON public.question_bank FOR INSERT 
WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update their own questions" 
ON public.question_bank FOR UPDATE 
USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete their own questions" 
ON public.question_bank FOR DELETE 
USING (auth.uid() = tutor_id);
