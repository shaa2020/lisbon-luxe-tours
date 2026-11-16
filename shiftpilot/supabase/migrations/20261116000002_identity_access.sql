-- ============================================================================
-- ShiftPilot — 0002 Agency, identity, roles, permissions and audit log
--
-- `auth.users` (managed by Supabase Auth) is the canonical user table; the
-- `profiles` table holds application-level profile data (1:1 with auth.users).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Agencies (tenants)
-- ---------------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  legal_name text,
  kvk_number text check (kvk_number is null or kvk_number ~ '^[0-9]{8}$'),
  vat_number text,
  country_code char(2) not null default 'NL',
  timezone text not null default 'Europe/Amsterdam',
  currency char(3) not null default 'EUR',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agency_settings (
  agency_id uuid primary key references public.agencies(id) on delete restrict,
  contact_email extensions.citext,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  iban text,
  default_payment_term_days integer not null default 14 check (default_payment_term_days between 0 and 180),
  default_vat_rate numeric(5,2) not null default 21.00 check (default_vat_rate between 0 and 100),
  invoice_prefix text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9-]{1,12}$'),
  -- Dutch staffing registrations. Status is tracked; it is never assumed.
  waadi_registration_number text,
  waadi_verified_at timestamptz,
  wtta_status text not null default 'unknown'
    check (wtta_status in ('unknown', 'not_required', 'applied', 'authorised', 'suspended', 'revoked')),
  wtta_reference text,
  wtta_status_checked_at timestamptz,
  -- Attendance location verification is OFF unless explicitly enabled with a
  -- published privacy notice.
  location_verification_enabled boolean not null default false,
  location_privacy_notice text,
  check (not location_verification_enabled or length(coalesce(location_privacy_notice, '')) >= 50),
  late_threshold_minutes integer not null default 5 check (late_threshold_minutes between 0 and 120),
  missing_checkin_alert_minutes integer not null default 15 check (missing_checkin_alert_minutes between 0 and 240),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email extensions.citext not null,
  full_name text,
  phone text,
  locale text not null default 'nl' check (locale in ('nl', 'en')),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);

-- Create the profile automatically when Supabase Auth creates a user.
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@invalid.local'),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- Keep profile email in sync with auth email.
create or replace function app.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function app.handle_auth_user_email_change();

-- ---------------------------------------------------------------------------
-- Roles and permissions
-- ---------------------------------------------------------------------------
create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  description text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  -- NULL agency_id = system role available to every agency.
  agency_id uuid references public.agencies(id) on delete cascade,
  key text not null check (key ~ '^[a-z_]{2,50}$'),
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_system = (agency_id is null))
);
create unique index roles_agency_key_uidx on public.roles (coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agency_id, user_id, role_id)
);
create index user_roles_user_idx on public.user_roles (user_id, agency_id);

-- Custom roles must belong to the same agency as the assignment.
create or replace function app.check_user_role_agency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role_agency uuid;
begin
  select agency_id into v_role_agency from public.roles where id = new.role_id;
  if v_role_agency is not null and v_role_agency <> new.agency_id then
    raise exception 'Role belongs to a different agency' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_user_roles_agency_check
  before insert or update on public.user_roles
  for each row execute function app.check_user_role_agency();

-- Sign-in / security activity log (Supabase Auth owns the actual sessions).
create table public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event text not null check (event in ('sign_in', 'sign_out', 'password_reset_requested', 'password_changed', 'sign_in_failed')),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index user_sessions_user_idx on public.user_sessions (user_id, created_at desc);
create trigger trg_user_sessions_append_only
  before update or delete on public.user_sessions
  for each row execute function app.prevent_mutation();

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so they can read membership tables
-- without recursive RLS evaluation). All are STABLE and use an empty
-- search_path to prevent search-path hijacking.
-- ---------------------------------------------------------------------------
create or replace function app.is_service_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') = 'service_role'
$$;

create or replace function app.is_agency_member(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.agencies a on a.id = ur.agency_id
    where ur.user_id = auth.uid()
      and ur.agency_id = p_agency_id
      and a.status <> 'archived'
  )
$$;

create or replace function app.has_permission(p_agency_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.agencies a on a.id = ur.agency_id
    where ur.user_id = auth.uid()
      and ur.agency_id = p_agency_id
      and rp.permission_key = p_permission
      and a.status <> 'archived'
  )
$$;

create or replace function app.staff_agency_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct ur.agency_id from public.user_roles ur where ur.user_id = auth.uid()
$$;

-- True for the service role, or when the statement is executed from trusted
-- database code (SECURITY DEFINER functions run as the owner, not as an API
-- role). Only meaningful when called from SECURITY INVOKER functions/triggers.
create or replace function app.is_privileged()
returns boolean
language sql
stable
set search_path = ''
as $$
  select app.is_service_role() or current_user not in ('authenticated', 'anon')
$$;

grant execute on function app.is_service_role() to authenticated, service_role;
grant execute on function app.is_privileged() to authenticated, service_role;
grant execute on function app.is_agency_member(uuid) to authenticated, service_role;
grant execute on function app.has_permission(uuid, text) to authenticated, service_role;
grant execute on function app.staff_agency_ids() to authenticated, service_role;

-- Public RPC: the current user's permissions in an agency (used by the UI to
-- hide unavailable actions; the server and RLS still enforce every action).
create or replace function public.my_permissions(p_agency_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where ur.user_id = auth.uid() and ur.agency_id = p_agency_id
$$;
revoke all on function public.my_permissions(uuid) from public, anon;
grant execute on function public.my_permissions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  agency_id uuid references public.agencies(id) on delete restrict,
  actor_user_id uuid,
  actor_role text,
  action text not null,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_agency_created_idx on public.audit_logs (agency_id, created_at desc);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);
create trigger trg_audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function app.prevent_mutation();

-- Columns never copied into audit snapshots.
create or replace function app.audit_redact(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p - array['encrypted_password', 'iban', 'token_hash', 'secret', 'access_token', 'refresh_token']
$$;

create or replace function app.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then app.audit_redact(to_jsonb(old)) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then app.audit_redact(to_jsonb(new)) end;
  v_agency uuid;
  v_record text;
  v_changed text[];
begin
  v_agency := coalesce((v_new ->> 'agency_id')::uuid, (v_old ->> 'agency_id')::uuid);
  if v_agency is null and tg_table_name = 'agencies' then
    v_agency := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
  end if;
  v_record := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'agency_id', v_old ->> 'agency_id');

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(v_new) n
    where n.key <> 'updated_at' and (v_old -> n.key) is distinct from n.value;
    if v_changed is null then
      return new;  -- no meaningful change
    end if;
  end if;

  insert into public.audit_logs (agency_id, actor_user_id, actor_role, action, table_name, record_id, old_data, new_data, changed_fields)
  values (v_agency, auth.uid(), auth.role(), lower(tg_op), tg_table_name, v_record, v_old, v_new, v_changed);

  return coalesce(new, old);
end;
$$;

create or replace function app.attach_audit(p_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger %I after insert or update or delete on %s for each row execute function app.audit_row_change()',
    'trg_' || (select relname from pg_class where oid = p_table) || '_audit', p_table
  );
end;
$$;

-- Explicit application-level audit entries (e.g. "invoice emailed").
create or replace function public.log_audit_event(p_agency_id uuid, p_action text, p_table text, p_record_id text, p_context jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (app.is_service_role() or app.is_agency_member(p_agency_id)) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  insert into public.audit_logs (agency_id, actor_user_id, actor_role, action, table_name, record_id, context)
  values (p_agency_id, auth.uid(), auth.role(), p_action, p_table, p_record_id, coalesce(p_context, '{}'::jsonb));
end;
$$;
revoke all on function public.log_audit_event(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.log_audit_event(uuid, text, text, text, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
select app.attach_standard_triggers('public.agencies', false);
select app.attach_standard_triggers('public.agency_settings', true);
select app.attach_standard_triggers('public.profiles', false);
select app.attach_standard_triggers('public.roles', true);
select app.attach_standard_triggers('public.user_roles', true);
select app.attach_audit('public.agencies');
select app.attach_audit('public.agency_settings');
select app.attach_audit('public.user_roles');
select app.attach_audit('public.roles');
select app.attach_audit('public.role_permissions');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.agencies enable row level security;
alter table public.agency_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_sessions enable row level security;
alter table public.audit_logs enable row level security;

-- agencies: staff read their agencies; settings managers update. Creation is
-- performed by the bootstrap procedure (service role) only.
create policy agencies_select on public.agencies for select to authenticated
  using (app.is_agency_member(id));
create policy agencies_update on public.agencies for update to authenticated
  using (app.has_permission(id, 'agency.settings.manage'))
  with check (app.has_permission(id, 'agency.settings.manage'));

create policy agency_settings_select on public.agency_settings for select to authenticated
  using (app.is_agency_member(agency_id));
create policy agency_settings_update on public.agency_settings for update to authenticated
  using (app.has_permission(agency_id, 'agency.settings.manage'))
  with check (app.has_permission(agency_id, 'agency.settings.manage'));

-- profiles: users read/update their own profile. Agency staff with
-- users.manage may read profiles of staff in the same agency.
create policy profiles_select_self on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_select_agency_staff on public.profiles for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = profiles.id and app.has_permission(ur.agency_id, 'users.manage')
  ));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- permissions catalogue is readable by all signed-in users.
create policy permissions_select on public.permissions for select to authenticated using (true);

create policy roles_select on public.roles for select to authenticated
  using (agency_id is null or app.is_agency_member(agency_id));
create policy roles_insert on public.roles for insert to authenticated
  with check (agency_id is not null and not is_system and app.has_permission(agency_id, 'roles.manage'));
create policy roles_update on public.roles for update to authenticated
  using (agency_id is not null and not is_system and app.has_permission(agency_id, 'roles.manage'))
  with check (agency_id is not null and not is_system and app.has_permission(agency_id, 'roles.manage'));
create policy roles_delete on public.roles for delete to authenticated
  using (agency_id is not null and not is_system and app.has_permission(agency_id, 'roles.manage'));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and (r.agency_id is null or app.is_agency_member(r.agency_id))));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (exists (select 1 from public.roles r where r.id = role_id and r.agency_id is not null and app.has_permission(r.agency_id, 'roles.manage')))
  with check (exists (select 1 from public.roles r where r.id = role_id and r.agency_id is not null and app.has_permission(r.agency_id, 'roles.manage')));

-- user_roles: a user sees their own assignments; managers see all in agency.
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or app.has_permission(agency_id, 'users.manage'));
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (app.has_permission(agency_id, 'users.manage'));
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (app.has_permission(agency_id, 'users.manage'));

-- Owner role can only be granted/revoked by an owner.
create or replace function app.guard_owner_role()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role_key text;
  v_row public.user_roles := coalesce(new, old);
begin
  select key into v_role_key from public.roles where id = v_row.role_id;
  -- Privileged contexts (service role, or accept_invitation() after the
  -- invitation itself was checked) may grant ownership.
  if v_role_key = 'agency_owner' and not app.is_privileged() then
    if not exists (
      select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and ur.agency_id = v_row.agency_id and r.key = 'agency_owner'
    ) then
      raise exception 'Only an agency owner can grant or revoke the owner role' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' and v_role_key = 'agency_owner' then
    if not exists (
      select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.agency_id = old.agency_id and r.key = 'agency_owner' and ur.id <> old.id
    ) then
      raise exception 'An agency must keep at least one owner' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_user_roles_owner_guard
  before insert or delete on public.user_roles
  for each row execute function app.guard_owner_role();

create policy user_sessions_select on public.user_sessions for select to authenticated
  using (user_id = auth.uid());
create policy user_sessions_insert on public.user_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy audit_logs_select on public.audit_logs for select to authenticated
  using (agency_id is not null and app.has_permission(agency_id, 'audit.read'));
-- No insert/update/delete policies: rows are written only by SECURITY DEFINER
-- triggers and functions.

-- ---------------------------------------------------------------------------
-- Reference data: permission catalogue and system roles.
-- This is configuration, not sample data.
-- ---------------------------------------------------------------------------
insert into public.permissions (key, category, description) values
  ('dashboard.view', 'general', 'View the agency dashboard'),
  ('agency.settings.manage', 'administration', 'Manage agency settings and registrations'),
  ('users.manage', 'administration', 'Invite staff and assign roles'),
  ('roles.manage', 'administration', 'Create and edit custom roles'),
  ('audit.read', 'administration', 'Read the audit log'),
  ('integrations.manage', 'administration', 'Configure external integrations'),
  ('crm.read', 'sales', 'View leads and sales pipeline'),
  ('crm.write', 'sales', 'Create and update leads and activities'),
  ('clients.read', 'clients', 'View client accounts'),
  ('clients.write', 'clients', 'Create and update client accounts'),
  ('clients.archive', 'clients', 'Archive client accounts'),
  ('workers.read', 'workforce', 'View worker profiles'),
  ('workers.write', 'workforce', 'Create and update worker profiles'),
  ('workers.sensitive.read', 'workforce', 'View sensitive worker data (identity, eligibility)'),
  ('workers.notes.read', 'workforce', 'Read internal notes about workers'),
  ('industries.manage', 'configuration', 'Manage industries, positions and requirements'),
  ('recruitment.read', 'recruitment', 'View job openings and applications'),
  ('recruitment.write', 'recruitment', 'Manage job openings, applications and interviews'),
  ('requests.read', 'scheduling', 'View client staffing requests'),
  ('requests.review', 'scheduling', 'Accept or reject client staffing requests'),
  ('shifts.read', 'scheduling', 'View shifts and assignments'),
  ('shifts.write', 'scheduling', 'Create, edit and cancel shifts'),
  ('shifts.assign', 'scheduling', 'Invite and assign workers to shifts'),
  ('matching.override', 'scheduling', 'Override non-mandatory matching criteria'),
  ('attendance.read', 'attendance', 'View attendance records'),
  ('attendance.correct', 'attendance', 'Process attendance corrections'),
  ('timesheets.read', 'attendance', 'View timesheets'),
  ('timesheets.approve', 'attendance', 'Give agency approval of timesheets'),
  ('rates.read', 'finance', 'View rate cards, wage and freelancer rates'),
  ('rates.write', 'finance', 'Manage rate cards, wage and freelancer rates'),
  ('finance.read', 'finance', 'View invoices, payments and financial reports'),
  ('finance.write', 'finance', 'Create and edit draft invoices'),
  ('invoices.issue', 'finance', 'Issue invoices and credit notes'),
  ('payments.record', 'finance', 'Record payments'),
  ('payroll.export', 'finance', 'Generate payroll exports'),
  ('purchase_invoices.approve', 'finance', 'Approve freelancer purchase invoices'),
  ('documents.read', 'documents', 'View worker and client documents'),
  ('documents.upload', 'documents', 'Upload documents'),
  ('documents.verify', 'documents', 'Verify documents'),
  ('compliance.read', 'compliance', 'View compliance reviews and checks'),
  ('compliance.review', 'compliance', 'Decide compliance and classification reviews'),
  ('gdpr.manage', 'compliance', 'Process data subject requests and retention'),
  ('reports.read', 'reporting', 'View reports and analytics'),
  ('notifications.manage', 'communication', 'Manage notification templates and delivery'),
  ('ai.assistant.use', 'automation', 'Use the AI operations assistant');

insert into public.roles (key, name, description, is_system) values
  ('agency_owner', 'Agency owner', 'Full access including owner management', true),
  ('agency_admin', 'Agency administrator', 'Full operational and administrative access', true),
  ('operations_manager', 'Operations manager', 'Requests, shifts, matching, attendance and timesheets', true),
  ('recruiter', 'Recruiter', 'Recruitment pipeline, onboarding and worker records', true),
  ('finance', 'Finance', 'Rates, invoicing, payments and payroll exports', true),
  ('compliance_officer', 'Compliance officer', 'Compliance reviews, documents, GDPR and audit', true),
  ('sales', 'Sales', 'CRM pipeline and client accounts', true);

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'agency_owner';

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'agency_admin';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array[
    'dashboard.view', 'clients.read', 'workers.read', 'industries.manage',
    'requests.read', 'requests.review', 'shifts.read', 'shifts.write', 'shifts.assign', 'matching.override',
    'attendance.read', 'attendance.correct', 'timesheets.read', 'timesheets.approve',
    'documents.read', 'reports.read', 'ai.assistant.use'
  ]) k
where r.key = 'operations_manager';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array[
    'dashboard.view', 'recruitment.read', 'recruitment.write', 'workers.read', 'workers.write',
    'workers.notes.read', 'documents.read', 'documents.upload', 'shifts.read', 'ai.assistant.use'
  ]) k
where r.key = 'recruiter';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array[
    'dashboard.view', 'clients.read', 'rates.read', 'rates.write', 'finance.read', 'finance.write',
    'invoices.issue', 'payments.record', 'payroll.export', 'purchase_invoices.approve',
    'timesheets.read', 'shifts.read', 'reports.read'
  ]) k
where r.key = 'finance';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array[
    'dashboard.view', 'workers.read', 'workers.sensitive.read', 'documents.read', 'documents.verify',
    'compliance.read', 'compliance.review', 'gdpr.manage', 'audit.read', 'clients.read', 'reports.read'
  ]) k
where r.key = 'compliance_officer';

insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r,
  unnest(array['dashboard.view', 'crm.read', 'crm.write', 'clients.read', 'clients.write', 'reports.read']) k
where r.key = 'sales';

grant select on public.permissions to authenticated;
