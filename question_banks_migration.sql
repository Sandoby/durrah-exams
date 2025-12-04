-- Question Banks Feature Migration
-- Run this in Supabase SQL Editor

-- Create question_banks table
CREATE TABLE IF NOT EXISTS question_banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create question_bank_questions table
CREATE TABLE IF NOT EXISTS question_bank_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id UUID NOT NULL REFERENCES question_banks(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'multiple_select', 'dropdown', 'numeric', 'true_false', 'short_answer')),
    question_text TEXT NOT NULL,
    options TEXT[], -- Array of answer options
    correct_answer TEXT, -- Can be JSON string for multiple_select
    points INTEGER DEFAULT 1,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_question_banks_tutor ON question_banks(tutor_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_questions_bank ON question_bank_questions(bank_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_questions_difficulty ON question_bank_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_questions_category ON question_bank_questions(category);

-- Enable RLS
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_banks
CREATE POLICY "Tutors can view their own question banks"
    ON question_banks FOR SELECT
    USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can create their own question banks"
    ON question_banks FOR INSERT
    WITH CHECK (auth.uid() = tutor_id);

CREATE POLICY "Tutors can update their own question banks"
    ON question_banks FOR UPDATE
    USING (auth.uid() = tutor_id);

CREATE POLICY "Tutors can delete their own question banks"
    ON question_banks FOR DELETE
    USING (auth.uid() = tutor_id);

-- RLS Policies for question_bank_questions
CREATE POLICY "Tutors can view questions from their banks"
    ON question_bank_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM question_banks
            WHERE question_banks.id = question_bank_questions.bank_id
            AND question_banks.tutor_id = auth.uid()
        )
    );

CREATE POLICY "Tutors can create questions in their banks"
    ON question_bank_questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM question_banks
            WHERE question_banks.id = question_bank_questions.bank_id
            AND question_banks.tutor_id = auth.uid()
        )
    );

CREATE POLICY "Tutors can update questions in their banks"
    ON question_bank_questions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM question_banks
            WHERE question_banks.id = question_bank_questions.bank_id
            AND question_banks.tutor_id = auth.uid()
        )
    );

CREATE POLICY "Tutors can delete questions in their banks"
    ON question_bank_questions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM question_banks
            WHERE question_banks.id = question_bank_questions.bank_id
            AND question_banks.tutor_id = auth.uid()
        )
    );

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_question_banks_updated_at
    BEFORE UPDATE ON question_banks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_questions_updated_at
    BEFORE UPDATE ON question_bank_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
