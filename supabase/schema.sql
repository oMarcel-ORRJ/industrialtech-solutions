create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('ADM', 'Planejador', 'Operador')),
  technician_id text,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles for select
  to authenticated
  using (auth.uid() = id);

create table if not exists public.industrial_workspace (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null default '{"equipment":[],"technicians":[],"parts":[],"orders":[],"plans":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.industrial_workspace enable row level security;

drop policy if exists "Authenticated users can read the shared workspace" on public.industrial_workspace;
drop policy if exists "Authenticated users can insert the shared workspace" on public.industrial_workspace;
drop policy if exists "Authenticated users can update the shared workspace" on public.industrial_workspace;

create policy "Authenticated users can read the shared workspace"
  on public.industrial_workspace for select
  to authenticated
  using (true);

create policy "Authenticated users can insert the shared workspace"
  on public.industrial_workspace for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update the shared workspace"
  on public.industrial_workspace for update
  to authenticated
  using (true)
  with check (true);
