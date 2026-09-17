-- KIA organizational layer: projects, project membership, and tasks.
-- Requires the existing KIA profiles/roles/auth foundation and is_kia_admin() helper.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  status text not null default 'active' check (status in ('planned','active','on_hold','completed','archived')),
  owner_id uuid not null references auth.users(id) on delete restrict,
  department_id uuid references public.departments(id) on delete set null,
  due_date date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member','lead','viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','review','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_department_id_idx on public.projects(department_id);
create index if not exists project_members_user_id_idx on public.project_members(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);

create or replace function public.set_kia_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_kia_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_kia_updated_at();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

create schema if not exists private;
create or replace function private.user_project_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select pm.project_id from public.project_members pm where pm.user_id = (select auth.uid())
  union select p.id from public.projects p where p.owner_id = (select auth.uid())
$$;
create or replace function private.user_owned_project_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.projects p where p.owner_id = (select auth.uid())
$$;
revoke all on function private.user_project_ids() from public;
revoke all on function private.user_owned_project_ids() from public;
grant execute on function private.user_project_ids() to authenticated;
grant execute on function private.user_owned_project_ids() to authenticated;

create policy "Active staff can view accessible projects" on public.projects for select to authenticated
using (is_kia_admin() or id in (select private.user_project_ids()));
create policy "Staff can create projects" on public.projects for insert to authenticated
with check (owner_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy "Owners and admins manage projects" on public.projects for update to authenticated
using (is_kia_admin() or owner_id = (select auth.uid()))
with check (is_kia_admin() or owner_id = (select auth.uid()));
create policy "Owners and admins delete projects" on public.projects for delete to authenticated
using (is_kia_admin() or owner_id = (select auth.uid()));

create policy "Staff can view project membership" on public.project_members for select to authenticated
using (is_kia_admin() or user_id = (select auth.uid()) or project_id in (select private.user_owned_project_ids()));
create policy "Owners and admins manage project membership" on public.project_members for all to authenticated
using (is_kia_admin() or project_id in (select private.user_owned_project_ids()))
with check (is_kia_admin() or project_id in (select private.user_owned_project_ids()));

create policy "Staff can view accessible tasks" on public.tasks for select to authenticated
using (is_kia_admin() or assignee_id = (select auth.uid()) or created_by = (select auth.uid()) or project_id in (select private.user_project_ids()));
create policy "Staff can create tasks in accessible projects" on public.tasks for insert to authenticated
with check (created_by = (select auth.uid()) and (is_kia_admin() or project_id in (select private.user_project_ids())));
create policy "Users can update accessible tasks" on public.tasks for update to authenticated
using (is_kia_admin() or assignee_id = (select auth.uid()) or created_by = (select auth.uid()) or project_id in (select private.user_owned_project_ids()))
with check (is_kia_admin() or assignee_id = (select auth.uid()) or created_by = (select auth.uid()) or project_id in (select private.user_owned_project_ids()));
create policy "Owners and admins delete tasks" on public.tasks for delete to authenticated
using (is_kia_admin() or created_by = (select auth.uid()) or project_id in (select private.user_owned_project_ids()));

grant select,insert,update,delete on public.projects to authenticated;
grant select,insert,update,delete on public.project_members to authenticated;
grant select,insert,update,delete on public.tasks to authenticated;

drop policy if exists "Admins can view staff profiles" on public.profiles;
create policy "Admins can view staff profiles" on public.profiles for select to authenticated using (is_kia_admin());
drop policy if exists "Admins can update staff profiles" on public.profiles;
create policy "Admins can update staff profiles" on public.profiles for update to authenticated using (is_kia_admin()) with check (is_kia_admin());
grant select,update on public.profiles to authenticated;
