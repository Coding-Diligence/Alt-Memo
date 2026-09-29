-- Exécuter ce script dans Supabase > SQL Editor.
-- Chaque utilisateur ne peut lire ou modifier que ses propres candidatures.
create table if not exists public.applications (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null default '',
  status text not null check (status in ('En attente', 'À voir', 'Accepté', 'Refusé')),
  date date not null,
  website text not null default '',
  email text not null default '',
  contact text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.applications enable row level security;

drop policy if exists "Users can read their own applications" on public.applications;
create policy "Users can read their own applications"
  on public.applications for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own applications" on public.applications;
create policy "Users can add their own applications"
  on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own applications" on public.applications;
create policy "Users can update their own applications"
  on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own applications" on public.applications;
create policy "Users can delete their own applications"
  on public.applications for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.applications to authenticated;
