-- ============================================================================
-- ShiftPilot — 0003 CRM and client management
-- ============================================================================

create type public.lead_stage as enum ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost');
create type public.client_status as enum ('onboarding', 'active', 'on_hold', 'archived');
create type public.client_member_role as enum ('client_admin', 'client_manager', 'client_viewer');
create type public.contract_status as enum ('draft', 'pending_signature', 'active', 'expired', 'terminated');

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 200),
  legal_name text,
  kvk_number text check (kvk_number is null or kvk_number ~ '^[0-9]{8}$'),
  vat_number text,
  status public.client_status not null default 'onboarding',
  billing_email extensions.citext,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_postal_code text,
  billing_city text,
  billing_country_code char(2) not null default 'NL',
  payment_term_days integer check (payment_term_days between 0 and 180),
  po_number_required boolean not null default false,
  account_manager_id uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id),
  check ((status = 'archived') = (archived_at is not null))
);
create unique index clients_agency_kvk_uidx on public.clients (agency_id, kvk_number) where kvk_number is not null;
create index clients_agency_status_idx on public.clients (agency_id, status);

create table public.client_locations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  postal_code text not null,
  city text not null,
  country_code char(2) not null default 'NL',
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  geofence_radius_m integer check (geofence_radius_m between 25 and 5000),
  arrival_instructions text,
  parking_info text,
  site_contact_name text,
  site_contact_phone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  unique (agency_id, id),
  unique (client_id, id)
);
create index client_locations_client_idx on public.client_locations (client_id);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  full_name text not null,
  email extensions.citext,
  phone text,
  job_title text,
  is_primary boolean not null default false,
  is_billing_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade
);
create index client_contacts_client_idx on public.client_contacts (client_id);
create unique index client_contacts_one_primary on public.client_contacts (client_id) where is_primary;

create table public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.client_member_role not null default 'client_manager',
  can_request_staff boolean not null default true,
  can_approve_timesheets boolean not null default false,
  can_view_finance boolean not null default false,
  can_manage_users boolean not null default false,
  status public.record_status not null default 'active',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade,
  unique (client_id, user_id),
  unique (client_id, id)
);
create index client_memberships_user_idx on public.client_memberships (user_id) where status = 'active';

-- Location-level scope. A membership with no rows here covers all locations.
create table public.client_membership_locations (
  membership_id uuid not null,
  location_id uuid not null,
  client_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (membership_id, location_id),
  foreign key (client_id, membership_id) references public.client_memberships(client_id, id) on delete cascade,
  foreign key (client_id, location_id) references public.client_locations(client_id, id) on delete cascade
);

create table public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  reference text not null,
  title text not null,
  status public.contract_status not null default 'draft',
  start_date date not null,
  end_date date,
  payment_term_days integer check (payment_term_days between 0 and 180),
  notice_period_days integer check (notice_period_days >= 0),
  signed_at timestamptz,
  signed_by_name text,
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  unique (agency_id, reference),
  unique (agency_id, id),
  check (end_date is null or end_date >= start_date),
  check (status not in ('active', 'expired', 'terminated') or signed_at is not null)
);
create index client_contracts_client_idx on public.client_contracts (client_id, status);

create table public.contract_terms (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  contract_id uuid not null,
  term_type text not null check (term_type in ('general', 'pricing', 'liability', 'cancellation', 'equal_treatment', 'confidentiality', 'other')),
  title text not null,
  body text not null,
  value jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, contract_id) references public.client_contracts(agency_id, id) on delete cascade
);
create index contract_terms_contract_idx on public.contract_terms (contract_id, sort_order);

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  company_name text not null,
  contact_name text,
  email extensions.citext,
  phone text,
  source text,
  stage public.lead_stage not null default 'new',
  owner_id uuid references public.profiles(id) on delete set null,
  estimated_monthly_hours integer check (estimated_monthly_hours >= 0),
  estimated_monthly_value numeric(12,2) check (estimated_monthly_value >= 0),
  next_follow_up_at timestamptz,
  lost_reason text,
  converted_client_id uuid,
  stage_changed_at timestamptz not null default now(),
  won_at timestamptz,
  lost_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, converted_client_id) references public.clients(agency_id, id) on delete set null (converted_client_id),
  unique (agency_id, id),
  check (stage <> 'lost' or lost_reason is not null)
);
create index leads_agency_stage_idx on public.leads (agency_id, stage);
create index leads_follow_up_idx on public.leads (agency_id, next_follow_up_at) where next_follow_up_at is not null;

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  lead_id uuid not null,
  activity_type text not null check (activity_type in ('note', 'call', 'email', 'meeting', 'task', 'stage_change')),
  subject text,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, lead_id) references public.leads(agency_id, id) on delete cascade
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);

-- Stage bookkeeping: timestamps and automatic stage-change activity.
create or replace function app.lead_stage_bookkeeping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    new.won_at := case when new.stage = 'won' then now() else null end;
    new.lost_at := case when new.stage = 'lost' then now() else null end;
    insert into public.lead_activities (agency_id, lead_id, activity_type, subject, created_by)
    values (new.agency_id, new.id, 'stage_change', old.stage::text || ' → ' || new.stage::text, auth.uid());
  end if;
  return new;
end;
$$;
create trigger trg_leads_stage before update of stage on public.leads
  for each row execute function app.lead_stage_bookkeeping();

-- ---------------------------------------------------------------------------
-- Internal notes (agency staff only; never visible to clients or workers)
-- ---------------------------------------------------------------------------
create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  subject_type text not null check (subject_type in ('client', 'worker', 'application', 'shift', 'lead')),
  subject_id uuid not null,
  body text not null check (length(body) between 1 and 10000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index internal_notes_subject_idx on public.internal_notes (agency_id, subject_type, subject_id);

-- ---------------------------------------------------------------------------
-- Client authorization helpers
-- ---------------------------------------------------------------------------
create or replace function app.is_client_member(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_memberships m
    join public.clients c on c.id = m.client_id
    where m.client_id = p_client_id and m.user_id = auth.uid()
      and m.status = 'active' and c.status <> 'archived'
  )
$$;

-- p_capability: 'request' | 'approve' | 'finance' | 'manage_users'
create or replace function app.client_can(p_client_id uuid, p_capability text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_memberships m
    join public.clients c on c.id = m.client_id
    where m.client_id = p_client_id and m.user_id = auth.uid()
      and m.status = 'active' and c.status <> 'archived'
      and case p_capability
        when 'request' then m.can_request_staff
        when 'approve' then m.can_approve_timesheets
        when 'finance' then m.can_view_finance
        when 'manage_users' then m.can_manage_users
        else false
      end
  )
$$;

create or replace function app.client_location_allowed(p_client_id uuid, p_location_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.client_memberships m
    join public.clients c on c.id = m.client_id
    where m.client_id = p_client_id and m.user_id = auth.uid()
      and m.status = 'active' and c.status <> 'archived'
      and (
        p_location_id is null
        or not exists (select 1 from public.client_membership_locations l where l.membership_id = m.id)
        or exists (select 1 from public.client_membership_locations l where l.membership_id = m.id and l.location_id = p_location_id)
      )
  )
$$;

create or replace function app.member_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.client_id from public.client_memberships m
  where m.user_id = auth.uid() and m.status = 'active'
$$;

grant execute on function app.is_client_member(uuid) to authenticated, service_role;
grant execute on function app.client_can(uuid, text) to authenticated, service_role;
grant execute on function app.client_location_allowed(uuid, uuid) to authenticated, service_role;
grant execute on function app.member_client_ids() to authenticated, service_role;

-- Prevent client users from escalating their own membership.
create or replace function app.guard_client_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or app.has_permission(new.agency_id, 'clients.write') then
    return new;
  end if;
  if new.user_id = auth.uid() then
    raise exception 'You cannot change your own client membership' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_client_memberships_guard before insert or update on public.client_memberships
  for each row execute function app.guard_client_membership();

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
select app.attach_standard_triggers('public.clients');
select app.attach_standard_triggers('public.client_locations');
select app.attach_standard_triggers('public.client_contacts');
select app.attach_standard_triggers('public.client_memberships');
select app.attach_standard_triggers('public.client_contracts');
select app.attach_standard_triggers('public.contract_terms');
select app.attach_standard_triggers('public.leads');
select app.attach_standard_triggers('public.lead_activities');
select app.attach_standard_triggers('public.internal_notes');
select app.attach_audit('public.clients');
select app.attach_audit('public.client_memberships');
select app.attach_audit('public.client_membership_locations');
select app.attach_audit('public.client_contracts');
select app.attach_audit('public.contract_terms');
select app.attach_audit('public.leads');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.client_locations enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_memberships enable row level security;
alter table public.client_membership_locations enable row level security;
alter table public.client_contracts enable row level security;
alter table public.contract_terms enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.internal_notes enable row level security;

-- clients: no DELETE policy (archive instead).
create policy clients_select on public.clients for select to authenticated
  using (app.has_permission(agency_id, 'clients.read') or app.is_client_member(id));
create policy clients_insert on public.clients for insert to authenticated
  with check (app.has_permission(agency_id, 'clients.write'));
create policy clients_update on public.clients for update to authenticated
  using (app.has_permission(agency_id, 'clients.write'))
  with check (app.has_permission(agency_id, 'clients.write')
              and (status <> 'archived' or app.has_permission(agency_id, 'clients.archive')));

create policy client_locations_select on public.client_locations for select to authenticated
  using (app.has_permission(agency_id, 'clients.read') or app.client_location_allowed(client_id, id));
create policy client_locations_write on public.client_locations for insert to authenticated
  with check (app.has_permission(agency_id, 'clients.write'));
create policy client_locations_update on public.client_locations for update to authenticated
  using (app.has_permission(agency_id, 'clients.write'))
  with check (app.has_permission(agency_id, 'clients.write'));

create policy client_contacts_select on public.client_contacts for select to authenticated
  using (app.has_permission(agency_id, 'clients.read') or app.is_client_member(client_id));
create policy client_contacts_insert on public.client_contacts for insert to authenticated
  with check (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));
create policy client_contacts_update on public.client_contacts for update to authenticated
  using (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'))
  with check (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));
create policy client_contacts_delete on public.client_contacts for delete to authenticated
  using (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));

create policy client_memberships_select on public.client_memberships for select to authenticated
  using (user_id = auth.uid()
         or app.has_permission(agency_id, 'clients.read')
         or app.client_can(client_id, 'manage_users'));
create policy client_memberships_insert on public.client_memberships for insert to authenticated
  with check (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));
create policy client_memberships_update on public.client_memberships for update to authenticated
  using (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'))
  with check (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));

create policy client_membership_locations_select on public.client_membership_locations for select to authenticated
  using (app.has_permission(agency_id, 'clients.read') or app.client_can(client_id, 'manage_users')
         or exists (select 1 from public.client_memberships m where m.id = membership_id and m.user_id = auth.uid()));
create policy client_membership_locations_write on public.client_membership_locations for all to authenticated
  using (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'))
  with check (app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users'));

create policy client_contracts_select on public.client_contracts for select to authenticated
  using (app.has_permission(agency_id, 'clients.read')
         or (status in ('active', 'expired', 'terminated', 'pending_signature') and app.client_can(client_id, 'finance')));
create policy client_contracts_insert on public.client_contracts for insert to authenticated
  with check (app.has_permission(agency_id, 'clients.write'));
create policy client_contracts_update on public.client_contracts for update to authenticated
  using (app.has_permission(agency_id, 'clients.write'))
  with check (app.has_permission(agency_id, 'clients.write'));

create policy contract_terms_select on public.contract_terms for select to authenticated
  using (app.has_permission(agency_id, 'clients.read')
         or exists (select 1 from public.client_contracts c
                    where c.id = contract_id and c.status in ('active', 'expired', 'terminated', 'pending_signature')
                      and app.client_can(c.client_id, 'finance')));
create policy contract_terms_write on public.contract_terms for all to authenticated
  using (app.has_permission(agency_id, 'clients.write')
         and exists (select 1 from public.client_contracts c where c.id = contract_id and c.status = 'draft'))
  with check (app.has_permission(agency_id, 'clients.write')
         and exists (select 1 from public.client_contracts c where c.id = contract_id and c.status = 'draft'));

create policy leads_select on public.leads for select to authenticated
  using (app.has_permission(agency_id, 'crm.read'));
create policy leads_insert on public.leads for insert to authenticated
  with check (app.has_permission(agency_id, 'crm.write'));
create policy leads_update on public.leads for update to authenticated
  using (app.has_permission(agency_id, 'crm.write'))
  with check (app.has_permission(agency_id, 'crm.write'));

create policy lead_activities_select on public.lead_activities for select to authenticated
  using (app.has_permission(agency_id, 'crm.read'));
create policy lead_activities_insert on public.lead_activities for insert to authenticated
  with check (app.has_permission(agency_id, 'crm.write'));
create policy lead_activities_update on public.lead_activities for update to authenticated
  using (app.has_permission(agency_id, 'crm.write') and activity_type <> 'stage_change')
  with check (app.has_permission(agency_id, 'crm.write') and activity_type <> 'stage_change');

create policy internal_notes_select on public.internal_notes for select to authenticated
  using (case subject_type
           when 'worker' then app.has_permission(agency_id, 'workers.notes.read')
           when 'application' then app.has_permission(agency_id, 'recruitment.read')
           when 'lead' then app.has_permission(agency_id, 'crm.read')
           when 'client' then app.has_permission(agency_id, 'clients.read')
           when 'shift' then app.has_permission(agency_id, 'shifts.read')
           else false end);
create policy internal_notes_insert on public.internal_notes for insert to authenticated
  with check (app.is_agency_member(agency_id) and created_by = auth.uid());
create policy internal_notes_update on public.internal_notes for update to authenticated
  using (created_by = auth.uid() and app.is_agency_member(agency_id))
  with check (created_by = auth.uid() and app.is_agency_member(agency_id));
