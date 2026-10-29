-- Run this script in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_name text not null check (char_length(student_name) between 2 and 100),
  student_email text not null check (char_length(student_email) <= 254),
  course_code text not null check (char_length(course_code) between 2 and 20),
  instructor_name text not null check (char_length(instructor_name) between 2 and 100),
  rating smallint not null check (rating between 1 and 5),
  comments text not null check (char_length(comments) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewed')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

-- Enable RLS. The server uses a service-role key kept in backend/.env;
-- no database credential is sent to the browser.
alter table public.feedback enable row level security;
