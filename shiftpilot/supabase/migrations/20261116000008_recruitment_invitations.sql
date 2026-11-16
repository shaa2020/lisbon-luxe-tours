-- ============================================================================
-- ShiftPilot — 0008 Recruitment, onboarding and invitations
-- ============================================================================

create type public.application_status as enum
  ('new', 'screening', 'interview', 'assessment', 'offer', 'onboarding', 'hired', 'rejected', 'withdrawn');

create table public.job_openings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  title text not null check (length(trim(title)) between 3 and 200),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$'),
  position_id uuid,
  industry_id uuid,
  engagement_types public.engagement_type[] not null default array['employee']::public.engagement_type[],
  location_city text,
  description text not null,
  requirements_text text,
  hours_indication text,
  pay_indication text,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict,
  unique (agency_id, slug),
  unique (agency_id, id),
  check (status <> 'published' or published_at is not null),
  check (cardinality(engagement_types) >= 1)
);
create index job_openings_public_idx on public.job_openings (agency_id, status, published_at desc);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  job_opening_id uuid,
  first_name text not null,
  last_name text not null,
  email extensions.citext not null,
  phone text,
  city text,
  preferred_engagement public.engagement_type,
  motivation text check (length(motivation) <= 5000),
  status public.application_status not null default 'new',
  source text,
  referral_worker_id uuid,
  referral_code text,
  privacy_notice_version text not null,
  privacy_acknowledged_at timestamptz not null,
  retention_until date not null,
  assigned_recruiter_id uuid references public.profiles(id) on delete set null,
  worker_id uuid,
  rejection_reason text,
  ai_summary text,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, job_opening_id) references public.job_openings(agency_id, id) on delete restrict,
  foreign key (agency_id, referral_worker_id) references public.workers(agency_id, id) on delete set null (referral_worker_id),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete set null (worker_id),
  unique (agency_id, id),
  check (status <> 'rejected' or rejection_reason is not null)
);
create index applications_agency_status_idx on public.applications (agency_id, status, created_at desc);
create index applications_email_idx on public.applications (agency_id, email);

alter table public.documents add constraint documents_application_fk
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete restrict;

create table public.application_documents (
  application_id uuid not null,
  document_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  kind text not null check (kind in ('resume', 'certificate', 'cover_letter', 'other')),
  created_at timestamptz not null default now(),
  primary key (application_id, document_id),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete cascade,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  application_id uuid not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  mode text not null check (mode in ('in_person', 'video', 'phone')),
  location_or_link text,
  interviewer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  outcome text check (outcome in ('positive', 'neutral', 'negative')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete cascade
);
create index interviews_application_idx on public.interviews (application_id);
create index interviews_schedule_idx on public.interviews (agency_id, scheduled_at);

create table public.screening_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  application_id uuid not null,
  criterion text not null,
  result text not null check (result in ('pass', 'fail', 'needs_information')),
  score smallint check (score between 0 and 100),
  notes text,
  assessed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete cascade
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  task_type text not null check (task_type in ('personal_info', 'professional_profile', 'documents', 'agreement', 'identity_check',
                                              'work_eligibility', 'contract', 'business_details', 'classification_review', 'training', 'other')),
  title text not null,
  description text,
  is_required boolean not null default true,
  -- Tasks marked staff_only can only be completed by agency staff (e.g. identity checks).
  staff_only boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'completed', 'waived', 'blocked')),
  due_date date,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  check (status not in ('completed', 'waived') or completed_at is not null)
);
create index onboarding_tasks_worker_idx on public.onboarding_tasks (worker_id, sort_order);

-- Workers may only move non-staff tasks to 'submitted'.
create or replace function app.guard_onboarding_task()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or app.has_permission(new.agency_id, 'workers.write') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Only staff can create onboarding tasks' using errcode = '42501';
  end if;
  if old.staff_only or new.status not in ('pending', 'submitted')
     or (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Workers may only submit their own onboarding tasks' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_onboarding_tasks_guard before insert or update on public.onboarding_tasks
  for each row execute function app.guard_onboarding_task();

-- ---------------------------------------------------------------------------
-- Invitations (staff, client users, workers). Only a SHA-256 hash of the
-- token is stored. Acceptance is performed by accept_invitation().
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  kind text not null check (kind in ('staff', 'client', 'worker')),
  email extensions.citext not null,
  role_id uuid references public.roles(id) on delete restrict,
  client_id uuid,
  client_role public.client_member_role,
  client_permissions jsonb,
  worker_id uuid,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete cascade,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  check (
    (kind = 'staff' and role_id is not null and client_id is null and worker_id is null)
    or (kind = 'client' and client_id is not null and client_role is not null and role_id is null and worker_id is null)
    or (kind = 'worker' and worker_id is not null and role_id is null and client_id is null)
  ),
  check (expires_at > created_at)
);
create index invitations_email_idx on public.invitations (email) where accepted_at is null and revoked_at is null;

create or replace function public.accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invitations;
  v_user uuid := auth.uid();
  v_email text;
  v_perms jsonb;
begin
  if v_user is null then
    raise exception 'Sign in to accept this invitation' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) < 32 then
    raise exception 'Invalid invitation' using errcode = 'P0002';
  end if;

  select * into v_inv from public.invitations
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
   for update;

  if not found or v_inv.revoked_at is not null then
    raise exception 'Invalid invitation' using errcode = 'P0002';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'This invitation has already been used' using errcode = 'P0001';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'This invitation has expired' using errcode = 'P0001';
  end if;

  select email into v_email from public.profiles where id = v_user;
  if lower(v_email) <> lower(v_inv.email::text) then
    raise exception 'This invitation was issued to a different email address' using errcode = '42501';
  end if;

  if v_inv.kind = 'staff' then
    insert into public.user_roles (agency_id, user_id, role_id, granted_by)
    values (v_inv.agency_id, v_user, v_inv.role_id, v_inv.invited_by)
    on conflict (agency_id, user_id, role_id) do nothing;
  elsif v_inv.kind = 'client' then
    v_perms := coalesce(v_inv.client_permissions, '{}'::jsonb);
    insert into public.client_memberships (agency_id, client_id, user_id, role, can_request_staff, can_approve_timesheets,
                                           can_view_finance, can_manage_users, invited_by)
    values (v_inv.agency_id, v_inv.client_id, v_user, v_inv.client_role,
            coalesce((v_perms ->> 'can_request_staff')::boolean, true),
            coalesce((v_perms ->> 'can_approve_timesheets')::boolean, false),
            coalesce((v_perms ->> 'can_view_finance')::boolean, false),
            coalesce((v_perms ->> 'can_manage_users')::boolean, false),
            v_inv.invited_by)
    on conflict (client_id, user_id) do update set status = 'active';
  else
    update public.workers
       set user_id = v_user,
           status = case when status = 'invited' then 'onboarding'::public.worker_status else status end
     where id = v_inv.worker_id and agency_id = v_inv.agency_id
       and (user_id is null or user_id = v_user);
    if not found then
      raise exception 'This worker profile is already linked to another account' using errcode = 'P0001';
    end if;
  end if;

  update public.invitations set accepted_at = now(), accepted_by = v_user where id = v_inv.id;

  return jsonb_build_object('agency_id', v_inv.agency_id, 'kind', v_inv.kind,
                            'client_id', v_inv.client_id, 'worker_id', v_inv.worker_id);
end;
$$;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers, RLS
-- ---------------------------------------------------------------------------
create or replace function app.application_status_bookkeeping()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger trg_applications_status before update of status on public.applications
  for each row execute function app.application_status_bookkeeping();

select app.attach_standard_triggers('public.job_openings');
select app.attach_standard_triggers('public.applications');
select app.attach_standard_triggers('public.interviews');
select app.attach_standard_triggers('public.onboarding_tasks');
create trigger trg_invitations_agency_immutable before update on public.invitations for each row execute function app.prevent_agency_change();
select app.attach_audit('public.job_openings');
select app.attach_audit('public.applications');
select app.attach_audit('public.onboarding_tasks');
select app.attach_audit('public.invitations');

alter table public.job_openings enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.interviews enable row level security;
alter table public.screening_records enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.invitations enable row level security;

-- Published openings are public (careers site).
grant select on public.job_openings to anon;
create policy job_openings_public_select on public.job_openings for select to anon, authenticated
  using (status = 'published' and (closes_at is null or closes_at > now()));
create policy job_openings_staff_select on public.job_openings for select to authenticated
  using (app.has_permission(agency_id, 'recruitment.read'));
create policy job_openings_insert on public.job_openings for insert to authenticated
  with check (app.has_permission(agency_id, 'recruitment.write'));
create policy job_openings_update on public.job_openings for update to authenticated
  using (app.has_permission(agency_id, 'recruitment.write')) with check (app.has_permission(agency_id, 'recruitment.write'));

-- Applications are submitted through a rate-limited server endpoint (service
-- role); there is intentionally no anon INSERT policy.
create policy applications_select on public.applications for select to authenticated
  using (app.has_permission(agency_id, 'recruitment.read'));
create policy applications_insert on public.applications for insert to authenticated
  with check (app.has_permission(agency_id, 'recruitment.write'));
create policy applications_update on public.applications for update to authenticated
  using (app.has_permission(agency_id, 'recruitment.write')) with check (app.has_permission(agency_id, 'recruitment.write'));

do $$
declare t text;
begin
  foreach t in array array['application_documents', 'interviews', 'screening_records']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (app.has_permission(agency_id, %L))',
      t || '_select', t, 'recruitment.read');
    execute format('create policy %I on public.%I for all to authenticated using (app.has_permission(agency_id, %L)) with check (app.has_permission(agency_id, %L))',
      t || '_write', t, 'recruitment.write', 'recruitment.write');
  end loop;
end $$;

create policy onboarding_tasks_select on public.onboarding_tasks for select to authenticated
  using (app.has_permission(agency_id, 'workers.read') or app.is_worker_self(worker_id));
create policy onboarding_tasks_insert on public.onboarding_tasks for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write'));
create policy onboarding_tasks_update on public.onboarding_tasks for update to authenticated
  using (app.has_permission(agency_id, 'workers.write') or app.is_worker_self(worker_id))
  with check (app.has_permission(agency_id, 'workers.write') or app.is_worker_self(worker_id));

-- Invitations: visible to the staff who manage the target population.
create policy invitations_select on public.invitations for select to authenticated
  using (case kind
           when 'staff' then app.has_permission(agency_id, 'users.manage')
           when 'client' then app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users')
           when 'worker' then app.has_permission(agency_id, 'workers.write')
         end);
create policy invitations_insert on public.invitations for insert to authenticated
  with check (invited_by = auth.uid() and case kind
           when 'staff' then app.has_permission(agency_id, 'users.manage')
           when 'client' then app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users')
           when 'worker' then app.has_permission(agency_id, 'workers.write')
         end);
-- Only revocation is allowed through the API (acceptance uses accept_invitation()).
create policy invitations_update on public.invitations for update to authenticated
  using (accepted_at is null and case kind
           when 'staff' then app.has_permission(agency_id, 'users.manage')
           when 'client' then app.has_permission(agency_id, 'clients.write') or app.client_can(client_id, 'manage_users')
           when 'worker' then app.has_permission(agency_id, 'workers.write')
         end)
  with check (accepted_at is null);

create or replace function app.guard_invitation_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() then
    return new;
  end if;
  if (to_jsonb(new) - 'revoked_at') is distinct from (to_jsonb(old) - 'revoked_at') then
    raise exception 'Invitations can only be revoked' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_invitations_guard before update on public.invitations
  for each row execute function app.guard_invitation_update();

-- Owner invitations can only be issued by an existing owner.
create or replace function app.guard_owner_invitation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.kind = 'staff' and not app.is_privileged()
     and (select key from public.roles where id = new.role_id) = 'agency_owner'
     and not exists (
       select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
       where ur.user_id = auth.uid() and ur.agency_id = new.agency_id and r.key = 'agency_owner') then
    raise exception 'Only an agency owner can invite another owner' using errcode = '42501';
  end if;
  -- Custom roles must belong to the inviting agency.
  if new.role_id is not null and exists (
       select 1 from public.roles r where r.id = new.role_id and r.agency_id is not null and r.agency_id <> new.agency_id) then
    raise exception 'Role belongs to a different agency' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_invitations_owner_guard before insert on public.invitations
  for each row execute function app.guard_owner_invitation();
