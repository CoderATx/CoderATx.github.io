-- Städcheck-setup (kör i SQL Editor i Supabase-projektet "app")
create or replace function public.sc_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.st_profiles where user_id = auth.uid()), false);
$$;

create table if not exists public.st_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  email text, company_name text, org_no text, phone text,
  onboarding_done boolean default false, is_admin boolean default false,
  created_at timestamptz default now()
);
alter table public.st_profiles enable row level security;
drop policy if exists "sc own profile" on public.st_profiles;
create policy "sc own profile" on public.st_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sc admin read profiles" on public.st_profiles;
create policy "sc admin read profiles" on public.st_profiles for select using (public.sc_is_admin());

create table if not exists public.st_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, address text, contact text, notes text,
  created_at timestamptz default now()
);
alter table public.st_customers enable row level security;
drop policy if exists "sc own customers" on public.st_customers;
create policy "sc own customers" on public.st_customers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sc admin read customers" on public.st_customers;
create policy "sc admin read customers" on public.st_customers for select using (public.sc_is_admin());

create table if not exists public.st_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  customer_id uuid references public.st_customers on delete set null,
  customer_name text, job_date date not null default current_date,
  items jsonb default '[]'::jsonb, material numeric default 0,
  rut boolean default true, vat int default 25, hours numeric,
  ai_summary text, ai_customer_msg text, status text default 'klar',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.st_jobs enable row level security;
drop policy if exists "sc own jobs" on public.st_jobs;
create policy "sc own jobs" on public.st_jobs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sc admin read jobs" on public.st_jobs;
create policy "sc admin read jobs" on public.st_jobs for select using (public.sc_is_admin());

create table if not exists public.sc_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  event text, created_at timestamptz default now()
);
alter table public.sc_events enable row level security;
drop policy if exists "sc own events ins" on public.sc_events;
create policy "sc own events ins" on public.sc_events for insert with check (auth.uid() = user_id);
drop policy if exists "sc own events sel" on public.sc_events;
create policy "sc own events sel" on public.sc_events for select using (auth.uid() = user_id);
drop policy if exists "sc admin read events" on public.sc_events;
create policy "sc admin read events" on public.sc_events for select using (public.sc_is_admin());

-- Gör ditt konto till admin:
update public.st_profiles set is_admin = true
  where user_id = (select id from auth.users where email = 'anilattaner2@gmail.com');
