-- Create tables

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exams table
create table public.exams (
  id uuid default gen_random_uuid() primary key,
  tutor_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  settings jsonb default '{}'::jsonb,
  required_fields text[],
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Questions table
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references public.exams(id) on delete cascade not null,
  type text not null,
  question_text text not null,
  options jsonb, -- Array of strings for MCQ
  correct_answer text,
  points integer default 1,
  randomize_options boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Submissions table
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  exam_id uuid references public.exams(id) on delete cascade not null,
  student_name text not null,
  student_email text not null,
  score integer,
  max_score integer,
  percentage numeric,
  violations jsonb default '[]'::jsonb,
  browser_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Submission Answers table
create table public.submission_answers (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references public.submissions(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  answer text,
  is_correct boolean,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;

-- Policies

-- Profiles: Users can view and update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Exams: Tutors can manage their own exams
create policy "Tutors can view own exams" on public.exams
  for select using (auth.uid() = tutor_id);

create policy "Tutors can insert own exams" on public.exams
  for insert with check (auth.uid() = tutor_id);

create policy "Tutors can update own exams" on public.exams
  for update using (auth.uid() = tutor_id);

create policy "Tutors can delete own exams" on public.exams
  for delete using (auth.uid() = tutor_id);

-- Public access for students to view exam details (for taking the exam)
create policy "Students can view public exams" on public.exams
  for select using (true); 

-- Questions: Tutors can manage questions for their exams
create policy "Tutors can view questions for own exams" on public.questions
  for select using (
    exists (select 1 from public.exams where id = questions.exam_id and tutor_id = auth.uid())
  );

create policy "Tutors can insert questions for own exams" on public.questions
  for insert with check (
    exists (select 1 from public.exams where id = questions.exam_id and tutor_id = auth.uid())
  );

create policy "Tutors can update questions for own exams" on public.questions
  for update using (
    exists (select 1 from public.exams where id = questions.exam_id and tutor_id = auth.uid())
  );

create policy "Tutors can delete questions for own exams" on public.questions
  for delete using (
    exists (select 1 from public.exams where id = questions.exam_id and tutor_id = auth.uid())
  );

-- Students need to view questions to take the exam
create policy "Students can view questions" on public.questions
  for select using (true);

-- Submissions: Students can insert submissions, Tutors can view submissions for their exams
create policy "Students can insert submissions" on public.submissions
  for insert with check (true);

create policy "Tutors can view submissions for own exams" on public.submissions
  for select using (
    exists (select 1 from public.exams where id = submissions.exam_id and tutor_id = auth.uid())
  );

-- Submission Answers: Students can insert, Tutors can view
create policy "Students can insert answers" on public.submission_answers
  for insert with check (true);

create policy "Tutors can view answers for own exams" on public.submission_answers
  for select using (
    exists (
      select 1 from public.submissions s
      join public.exams e on s.exam_id = e.id
      where s.id = submission_answers.submission_id and e.tutor_id = auth.uid()
    )
  );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
