-- ============================================================================
-- ShiftPilot — 0004 Worker core records
--
-- Data minimisation: operational profile data lives in `workers`; sensitive
-- personal data lives in `worker_private_details`, readable only by the worker
-- and staff holding `workers.sensitive.read`. ShiftPilot does not store BSN
-- numbers or copies of identity documents' numbers; identity and work
-- eligibility are tracked as verification statuses. Payroll providers collect
-- statutory identifiers directly.
-- ============================================================================

create type public.worker_status as enum ('invited', 'onboarding', 'pending_review', 'active', 'suspended', 'inactive', 'archived');

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  worker_number text not null,
  engagement_type public.engagement_type not null,
  status public.worker_status not null default 'invited',
  first_name text not null,
  last_name text not null,
  display_name text,
  email extensions.citext not null,
  phone text,
  city text,
  postal_code text,
  home_latitude numeric(9,6) check (home_latitude between -90 and 90),
  home_longitude numeric(9,6) check (home_longitude between -180 and 180),
  max_travel_km integer check (max_travel_km between 0 and 500),
  professional_summary text check (length(professional_summary) <= 2000),
  photo_path text,
  onboarding_completed_at timestamptz,
  activated_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, worker_number),
  unique (agency_id, email),
  unique (agency_id, id),
  check ((status = 'archived') = (archived_at is not null))
);
create unique index workers_agency_user_uidx on public.workers (agency_id, user_id) where user_id is not null;
create index workers_agency_status_idx on public.workers (agency_id, status, engagement_type);
create index workers_user_idx on public.workers (user_id) where user_id is not null;

create table public.worker_private_details (
  worker_id uuid primary key,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  date_of_birth date check (date_of_birth > date '1900-01-01'),
  address_line1 text,
  address_line2 text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  identity_verification_status public.verification_status not null default 'not_submitted',
  identity_verified_at timestamptz,
  identity_verified_by uuid references public.profiles(id) on delete set null,
  work_eligibility_status public.verification_status not null default 'not_submitted',
  work_eligibility_expires_on date,
  work_eligibility_verified_at timestamptz,
  work_eligibility_verified_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Worker authorization helpers
-- ---------------------------------------------------------------------------
create or replace function app.is_worker_self(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workers w
    where w.id = p_worker_id and w.user_id = auth.uid() and w.status <> 'archived'
  )
$$;

create or replace function app.my_worker_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id from public.workers w where w.user_id = auth.uid() and w.status <> 'archived'
$$;

-- Any authenticated relationship with the agency (staff, client user, worker).
create or replace function app.is_agency_participant(p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_agency_member(p_agency_id)
    or exists (select 1 from public.client_memberships m
               where m.agency_id = p_agency_id and m.user_id = auth.uid() and m.status = 'active')
    or exists (select 1 from public.workers w
               where w.agency_id = p_agency_id and w.user_id = auth.uid() and w.status <> 'archived')
$$;

grant execute on function app.is_worker_self(uuid) to authenticated, service_role;
grant execute on function app.my_worker_ids() to authenticated, service_role;
grant execute on function app.is_agency_participant(uuid) to authenticated, service_role;

-- Workers may edit only their own contact/profile fields. Status, engagement
-- type, identity link and verification data are staff-controlled.
create or replace function app.guard_worker_self_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or app.has_permission(old.agency_id, 'workers.write') then
    return new;
  end if;
  if new.worker_number is distinct from old.worker_number
     or new.engagement_type is distinct from old.engagement_type
     or new.status is distinct from old.status
     or new.user_id is distinct from old.user_id
     or new.email is distinct from old.email
     or new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name
     or new.onboarding_completed_at is distinct from old.onboarding_completed_at
     or new.activated_at is distinct from old.activated_at
     or new.archived_at is distinct from old.archived_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Only agency staff can change these worker fields' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_workers_self_guard before update on public.workers
  for each row execute function app.guard_worker_self_update();

create or replace function app.guard_worker_private_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or (app.has_permission(old.agency_id, 'workers.sensitive.read') and app.has_permission(old.agency_id, 'workers.write')) then
    return new;
  end if;
  if new.identity_verification_status is distinct from old.identity_verification_status
     or new.identity_verified_at is distinct from old.identity_verified_at
     or new.identity_verified_by is distinct from old.identity_verified_by
     or new.work_eligibility_status is distinct from old.work_eligibility_status
     or new.work_eligibility_expires_on is distinct from old.work_eligibility_expires_on
     or new.work_eligibility_verified_at is distinct from old.work_eligibility_verified_at
     or new.work_eligibility_verified_by is distinct from old.work_eligibility_verified_by then
    raise exception 'Verification fields can only be changed by authorised staff' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_worker_private_guard before update on public.worker_private_details
  for each row execute function app.guard_worker_private_update();

-- Every worker gets a private-details row.
create or replace function app.create_worker_private_details()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.worker_private_details (worker_id, agency_id) values (new.id, new.agency_id)
  on conflict do nothing;
  return new;
end;
$$;
create trigger trg_workers_private_details after insert on public.workers
  for each row execute function app.create_worker_private_details();

select app.attach_standard_triggers('public.workers');
select app.attach_standard_triggers('public.worker_private_details');
select app.attach_audit('public.workers');
select app.attach_audit('public.worker_private_details');

alter table public.workers enable row level security;
alter table public.worker_private_details enable row level security;

-- Clients have NO direct access to workers; they receive a minimal projection
-- through dedicated functions scoped to their assignments.
create policy workers_select on public.workers for select to authenticated
  using (app.has_permission(agency_id, 'workers.read') or user_id = auth.uid());
create policy workers_insert on public.workers for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write'));
create policy workers_update on public.workers for update to authenticated
  using (app.has_permission(agency_id, 'workers.write') or user_id = auth.uid())
  with check (app.has_permission(agency_id, 'workers.write') or user_id = auth.uid());

create policy worker_private_select on public.worker_private_details for select to authenticated
  using (app.has_permission(agency_id, 'workers.sensitive.read') or app.is_worker_self(worker_id));
create policy worker_private_update on public.worker_private_details for update to authenticated
  using (app.has_permission(agency_id, 'workers.sensitive.read') or app.is_worker_self(worker_id))
  with check (app.has_permission(agency_id, 'workers.sensitive.read') or app.is_worker_self(worker_id));
