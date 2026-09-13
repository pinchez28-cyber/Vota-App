-- ============================================================
-- Civic Voice — Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  role text not null default 'citizen' check (role in ('citizen', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. SURVEYS
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  status text not null default 'pending' check (status in ('pending', 'open', 'closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closes_at timestamptz
);

-- 3. OPTIONS (choices per survey)
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id) on delete cascade not null,
  label text not null,
  vote_count integer not null default 0,
  position integer not null default 0
);

-- 4. VOTES (one per user per survey)
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id) on delete cascade not null,
  option_id uuid references public.options(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.surveys enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;

-- Profiles: anyone can read, only owner can update theirs
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Surveys: anyone can read open ones; admins can see all; citizens can insert pending
create policy "surveys_select_open" on public.surveys for select using (
  status = 'open' or auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "surveys_insert_auth" on public.surveys for insert with check (auth.uid() is not null);
create policy "surveys_update_admin" on public.surveys for update using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "surveys_delete_admin" on public.surveys for delete using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);

-- Options: readable if survey is open or user is admin
create policy "options_select" on public.options for select using (
  survey_id in (select id from public.surveys where status = 'open')
  or auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "options_insert_admin" on public.options for insert with check (
  auth.uid() in (select id from public.profiles where role = 'admin')
);
create policy "options_update_admin" on public.options for update using (
  auth.uid() in (select id from public.profiles where role = 'admin')
);

-- Votes: insert only if authenticated; read own votes
create policy "votes_select_own" on public.votes for select using (auth.uid() = user_id);
create policy "votes_insert_auth" on public.votes for insert with check (auth.uid() = user_id);

-- ============================================================
-- VOTE FUNCTION (atomic increment + insert)
-- ============================================================

create or replace function public.cast_vote(p_survey_id uuid, p_option_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Insert vote (unique constraint will reject duplicates)
  insert into public.votes (survey_id, option_id, user_id)
  values (p_survey_id, p_option_id, auth.uid());

  -- Increment the denormalized counter
  update public.options
  set vote_count = vote_count + 1
  where id = p_option_id;
end;
$$;

-- ============================================================
-- SEED DATA (4 sample open surveys)
-- ============================================================

do $$
declare
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  s3 uuid := gen_random_uuid();
  s4 uuid := gen_random_uuid();
begin
  insert into public.surveys (id, title, description, category, status, closes_at) values
    (s1, '2026 mayoral election — who do you support?',
     'Cast your preference for the upcoming mayoral race. Results are anonymous and used for civic research only.',
     'Politics', 'open', now() + interval '30 days'),
    (s2, 'Should the city expand its electric bus fleet?',
     'The city council is considering a $12M investment to double the electric bus fleet by 2027.',
     'Environment', 'open', now() + interval '20 days'),
    (s3, 'Which road project should be funded first?',
     'Budget allows for one major road improvement project this fiscal year.',
     'Infrastructure', 'open', now() + interval '25 days'),
    (s4, 'How should the city address rising traffic speeds?',
     'Speeding complaints have increased 40% this year. What approach do you prefer?',
     'Public Safety', 'open', now() + interval '28 days');

  insert into public.options (survey_id, label, vote_count, position) values
    (s1, 'Jordan Rivera', 312, 0), (s1, 'Sam Chen', 278, 1),
    (s1, 'Maria Okonkwo', 401, 2), (s1, 'Undecided', 89, 3),
    (s2, 'Yes, prioritize it', 544, 0), (s2, 'Yes, but reduce the budget', 198, 1),
    (s2, 'No, invest elsewhere', 103, 2), (s2, 'Need more information', 221, 3),
    (s3, 'Downtown bike lanes', 187, 0), (s3, 'Highway 9 repairs', 334, 1),
    (s3, 'Main St. pedestrian zone', 122, 2), (s3, 'Bridge inspection & repair', 289, 3),
    (s4, 'More speed cameras', 298, 0), (s4, 'Physical traffic calming', 217, 1),
    (s4, 'Increased police patrols', 136, 2), (s4, 'Community education', 112, 3);
end;
$$;
