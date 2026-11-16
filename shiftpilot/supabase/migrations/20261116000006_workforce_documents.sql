-- ============================================================================
-- ShiftPilot — 0006 Worker skills, credentials, availability and documents
-- ============================================================================

-- Generic guard: columns listed in TG_ARGV[1] (a JSON object of
-- column -> value-on-insert) may only be set by service role or staff holding
-- the permission in TG_ARGV[0]. Non-staff inserts are forced to the given
-- values; non-staff updates to those columns are rejected.
create or replace function app.guard_staff_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_perm text := tg_argv[0];
  v_protected jsonb := tg_argv[1]::jsonb;
  v_key text;
begin
  if app.is_privileged() or app.has_permission(new.agency_id, v_perm) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, v_protected);
    return new;
  end if;
  for v_key in select jsonb_object_keys(v_protected) loop
    if (to_jsonb(new) -> v_key) is distinct from (to_jsonb(old) -> v_key) then
      raise exception 'Field % can only be changed by authorised staff', v_key using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Skills, languages, credentials, experience
-- ---------------------------------------------------------------------------
create table public.worker_skills (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  skill_id uuid not null,
  level smallint not null default 1 check (level between 1 and 5),
  years_experience numeric(4,1) check (years_experience between 0 and 60),
  is_verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, skill_id) references public.skills(agency_id, id) on delete restrict,
  unique (worker_id, skill_id)
);

create table public.worker_languages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  language_code text not null check (language_code ~ '^[a-z]{2}$'),
  level text not null check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  unique (worker_id, language_code)
);

create table public.worker_experience (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  employer_name text not null,
  role_title text not null,
  industry_id uuid,
  position_id uuid,
  start_date date not null,
  end_date date,
  description text,
  is_verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  check (end_date is null or end_date >= start_date)
);
create index worker_experience_worker_idx on public.worker_experience (worker_id);

create table public.worker_availability (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  kind text not null check (kind in ('recurring', 'available', 'unavailable')),
  day_of_week smallint check (day_of_week between 1 and 7), -- ISO: 1 = Monday
  start_time time,
  end_time time,
  date_from date,
  date_to date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  check (
    (kind = 'recurring' and day_of_week is not null and start_time is not null and end_time is not null and date_from is null and date_to is null)
    or (kind in ('available', 'unavailable') and date_from is not null and date_to is not null and date_to >= date_from and day_of_week is null)
  ),
  check (start_time is null or end_time is null or start_time <> end_time)
);
create index worker_availability_worker_idx on public.worker_availability (worker_id, kind);

-- ---------------------------------------------------------------------------
-- Documents (generic, versioned, private storage)
-- ---------------------------------------------------------------------------
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  key text not null check (key ~ '^[a-z0-9_]{2,50}$'),
  name text not null,
  applies_to text not null check (applies_to in ('worker', 'freelancer_business', 'client', 'agency', 'application')),
  required_for_engagement public.engagement_type[], -- NULL = not required at onboarding
  requires_expiry boolean not null default false,
  is_sensitive boolean not null default false,
  client_visible boolean not null default false,
  retention_months integer check (retention_months between 1 and 1200),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, key),
  unique (agency_id, id),
  check (not (is_sensitive and client_visible))
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  document_type_id uuid not null,
  owner_type text not null check (owner_type in ('worker', 'freelancer_business', 'client', 'agency', 'application')),
  worker_id uuid,
  client_id uuid,
  freelancer_business_id uuid, -- FK added in 0007
  application_id uuid,         -- FK added in 0008
  title text not null,
  status public.verification_status not null default 'pending',
  issued_on date,
  expires_on date,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  rejection_reason text,
  current_version integer not null default 0,
  archived_at timestamptz,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, document_type_id) references public.document_types(agency_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (expires_on is null or issued_on is null or expires_on >= issued_on),
  check (
    (owner_type = 'worker' and worker_id is not null)
    or (owner_type = 'client' and client_id is not null)
    or (owner_type = 'freelancer_business' and freelancer_business_id is not null)
    or (owner_type = 'application' and application_id is not null)
    or owner_type = 'agency'
  ),
  check (status <> 'rejected' or rejection_reason is not null)
);
create index documents_worker_idx on public.documents (worker_id) where worker_id is not null;
create index documents_client_idx on public.documents (client_id) where client_id is not null;
create index documents_expiry_idx on public.documents (agency_id, expires_on) where expires_on is not null and archived_at is null;

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  document_id uuid not null,
  version integer not null check (version > 0),
  storage_bucket text not null default 'documents',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (document_id, version),
  unique (storage_bucket, storage_path)
);
create trigger trg_document_versions_append_only before update or delete on public.document_versions
  for each row execute function app.prevent_mutation();

-- Versions are numbered by the database and bump the document's current version.
create or replace function app.document_version_assign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  select current_version + 1 into v_next from public.documents where id = new.document_id for update;
  new.version := v_next;
  update public.documents
     set current_version = v_next,
         status = case when status = 'verified' then 'pending' else status end,
         verified_at = null, verified_by = null
   where id = new.document_id;
  return new;
end;
$$;
create trigger trg_document_versions_assign before insert on public.document_versions
  for each row execute function app.document_version_assign();

create table public.worker_certificates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  certificate_id uuid not null,
  document_id uuid,
  certificate_number text,
  issued_on date,
  expires_on date,
  status public.verification_status not null default 'pending',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, certificate_id) references public.certificates(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);
create index worker_certificates_worker_idx on public.worker_certificates (worker_id, certificate_id);
create index worker_certificates_expiry_idx on public.worker_certificates (agency_id, expires_on) where expires_on is not null;

create table public.worker_qualifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  qualification_id uuid not null,
  document_id uuid,
  obtained_on date,
  expires_on date,
  status public.verification_status not null default 'pending',
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, qualification_id) references public.qualifications(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (worker_id, qualification_id)
);

-- Naming parity with the domain model: worker documents are documents owned by a worker.
create view public.worker_documents with (security_invoker = true) as
  select d.* from public.documents d where d.owner_type = 'worker';

-- ---------------------------------------------------------------------------
-- Guards, triggers
-- ---------------------------------------------------------------------------
create trigger trg_worker_skills_guard before insert or update on public.worker_skills
  for each row execute function app.guard_staff_columns('workers.write', '{"is_verified": false, "verified_by": null, "verified_at": null}');
create trigger trg_worker_experience_guard before insert or update on public.worker_experience
  for each row execute function app.guard_staff_columns('workers.write', '{"is_verified": false, "verified_by": null, "verified_at": null}');
create trigger trg_worker_certificates_guard before insert or update on public.worker_certificates
  for each row execute function app.guard_staff_columns('documents.verify', '{"status": "pending", "verified_by": null, "verified_at": null}');
create trigger trg_worker_qualifications_guard before insert or update on public.worker_qualifications
  for each row execute function app.guard_staff_columns('documents.verify', '{"status": "pending", "verified_by": null, "verified_at": null}');
create trigger trg_documents_guard before insert or update on public.documents
  for each row execute function app.guard_staff_columns('documents.verify', '{"status": "pending", "verified_by": null, "verified_at": null, "rejection_reason": null, "current_version": 0}');

select app.attach_standard_triggers('public.worker_skills');
select app.attach_standard_triggers('public.worker_languages');
select app.attach_standard_triggers('public.worker_experience');
select app.attach_standard_triggers('public.worker_availability');
select app.attach_standard_triggers('public.document_types');
select app.attach_standard_triggers('public.documents');
select app.attach_standard_triggers('public.worker_certificates');
select app.attach_standard_triggers('public.worker_qualifications');
select app.attach_audit('public.documents');
select app.attach_audit('public.document_versions');
select app.attach_audit('public.worker_certificates');
select app.attach_audit('public.worker_qualifications');
select app.attach_audit('public.document_types');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Worker-owned profile tables: staff (workers.read / workers.write) and the
-- worker themself. Clients have no direct access.
do $$
declare
  t text;
begin
  foreach t in array array['worker_skills', 'worker_languages', 'worker_experience', 'worker_availability', 'worker_certificates', 'worker_qualifications']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app.has_permission(agency_id, %L) or app.is_worker_self(worker_id))',
      t || '_select', t, 'workers.read');
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (app.has_permission(agency_id, %L) or app.is_worker_self(worker_id))',
      t || '_insert', t, 'workers.write');
    execute format(
      'create policy %I on public.%I for update to authenticated using (app.has_permission(agency_id, %L) or app.has_permission(agency_id, %L) or app.is_worker_self(worker_id)) with check (app.has_permission(agency_id, %L) or app.has_permission(agency_id, %L) or app.is_worker_self(worker_id))',
      t || '_update', t, 'workers.write', 'documents.verify', 'workers.write', 'documents.verify');
    execute format(
      'create policy %I on public.%I for delete to authenticated using (app.has_permission(agency_id, %L) or app.is_worker_self(worker_id))',
      t || '_delete', t, 'workers.write');
  end loop;
end $$;

-- Verified credentials are evidence; workers cannot delete them.
drop policy worker_certificates_delete on public.worker_certificates;
create policy worker_certificates_delete on public.worker_certificates for delete to authenticated
  using (app.has_permission(agency_id, 'workers.write') or (app.is_worker_self(worker_id) and status in ('pending', 'rejected')));
drop policy worker_qualifications_delete on public.worker_qualifications;
create policy worker_qualifications_delete on public.worker_qualifications for delete to authenticated
  using (app.has_permission(agency_id, 'workers.write') or (app.is_worker_self(worker_id) and status in ('pending', 'rejected')));

alter table public.document_types enable row level security;
create policy document_types_select on public.document_types for select to authenticated
  using (app.is_agency_participant(agency_id));
create policy document_types_write on public.document_types for all to authenticated
  using (app.has_permission(agency_id, 'agency.settings.manage'))
  with check (app.has_permission(agency_id, 'agency.settings.manage'));

-- Document visibility rules. The row-level variant evaluates the row's own
-- columns (so it also works for RETURNING on freshly inserted rows); the
-- id-based variant is used by storage policies.
create or replace function app.can_read_document_row(
  p_agency_id uuid, p_document_type_id uuid, p_worker_id uuid, p_client_id uuid, p_archived_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.document_types t
    where t.id = p_document_type_id
      and (
        -- staff; sensitive types additionally need workers.sensitive.read
        (app.has_permission(p_agency_id, 'documents.read')
          and (not t.is_sensitive or app.has_permission(p_agency_id, 'workers.sensitive.read')))
        -- the worker who owns it
        or (p_worker_id is not null and app.is_worker_self(p_worker_id))
        -- client users: only non-sensitive, client-visible documents of their own client
        or (p_client_id is not null and t.client_visible and not t.is_sensitive
            and p_archived_at is null and app.client_can(p_client_id, 'finance'))
      )
  )
$$;

create or replace function app.can_read_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select app.can_read_document_row(d.agency_id, d.document_type_id, d.worker_id, d.client_id, d.archived_at)
    from public.documents d where d.id = p_document_id), false)
$$;
grant execute on function app.can_read_document_row(uuid, uuid, uuid, uuid, timestamptz) to authenticated, service_role;
grant execute on function app.can_read_document(uuid) to authenticated, service_role;

alter table public.documents enable row level security;
create policy documents_select on public.documents for select to authenticated
  using (app.can_read_document_row(agency_id, document_type_id, worker_id, client_id, archived_at));
create policy documents_insert on public.documents for insert to authenticated
  with check (app.has_permission(agency_id, 'documents.upload')
              or (owner_type = 'worker' and app.is_worker_self(worker_id) and uploaded_by = auth.uid()));
create policy documents_update on public.documents for update to authenticated
  using (app.has_permission(agency_id, 'documents.upload') or app.has_permission(agency_id, 'documents.verify')
         or (owner_type = 'worker' and app.is_worker_self(worker_id)))
  with check (app.has_permission(agency_id, 'documents.upload') or app.has_permission(agency_id, 'documents.verify')
         or (owner_type = 'worker' and app.is_worker_self(worker_id)));
-- no DELETE policy: documents are archived, never hard-deleted by users.

alter table public.document_versions enable row level security;
create policy document_versions_select on public.document_versions for select to authenticated
  using (app.can_read_document(document_id));
create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and (app.has_permission(d.agency_id, 'documents.upload')
             or (d.owner_type = 'worker' and app.is_worker_self(d.worker_id)))
    )
  );
