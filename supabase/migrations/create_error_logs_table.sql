-- Create a table to store system errors
create table if not exists error_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  error_message text,
  stack_trace text,
  metadata jsonb default '{}'::jsonb,
  resolved boolean default false
);

-- Enable RLS
alter table error_logs enable row level security;

-- Policies
-- 1. Allow anyone (including anon) to INSERT errors. 
-- We need this because errors can happen before login or during login.
create policy "Allow public insert to error_logs"
  on error_logs for insert
  with check (true);

-- 2. Allow only admins/service_role to SELECT/VIEW errors.
-- (Assuming you have an admin definition, or we can restrict to authenticated for now if no admin role exists yet)
-- For now, we'll restrict to authenticated users who are likely admins, or you can check directly in dashboard.
-- Ideally, use service_role in Supabase dashboard to view these.
create policy "Allow service_role or admins to view errors"
  on error_logs for select
  using (auth.uid() in (select id from profiles where role = 'admin'));
