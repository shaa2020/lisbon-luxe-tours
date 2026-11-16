-- ============================================================================
-- ShiftPilot — 0014 Integrations, storage, agency bootstrap, hardening
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Integrations. Secrets are NEVER stored in the database: integration
-- accounts reference environment/secret-manager keys by name.
-- ---------------------------------------------------------------------------
create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  provider text not null check (provider in ('resend', 'whatsapp_cloud', 'web_push', 'google_maps', 'exact_online',
                                             'moneybird', 'afas', 'loket', 'nmbrs', 'sentry', 'openai', 'anthropic')),
  status text not null default 'awaiting_configuration'
    check (status in ('awaiting_configuration', 'active', 'error', 'disabled')),
  config jsonb not null default '{}'::jsonb,
  secret_ref text check (secret_ref is null or secret_ref ~ '^[A-Z][A-Z0-9_]{2,80}$'),
  last_verified_at timestamptz,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, provider),
  check (not (config ?| array['api_key', 'secret', 'token', 'password', 'access_token', 'refresh_token', 'client_secret']))
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  provider text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  url text check (url is null or url ~ '^https://'),
  events text[] not null default '{}',
  secret_ref text check (secret_ref is null or secret_ref ~ '^[A-Z][A-Z0-9_]{2,80}$'),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete restrict,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create table public.external_reference_mappings (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  provider text not null,
  entity_type text not null,
  entity_id uuid not null,
  external_id text not null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agency_id, provider, entity_type, entity_id),
  unique (agency_id, provider, entity_type, external_id)
);

select app.attach_standard_triggers('public.integration_accounts');
select app.attach_standard_triggers('public.webhook_endpoints');
select app.attach_audit('public.integration_accounts');
select app.attach_audit('public.webhook_endpoints');

alter table public.integration_accounts enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_events enable row level security;
alter table public.external_reference_mappings enable row level security;

create policy integration_accounts_all on public.integration_accounts for all to authenticated
  using (app.has_permission(agency_id, 'integrations.manage')) with check (app.has_permission(agency_id, 'integrations.manage'));
create policy webhook_endpoints_all on public.webhook_endpoints for all to authenticated
  using (app.has_permission(agency_id, 'integrations.manage')) with check (app.has_permission(agency_id, 'integrations.manage'));
create policy webhook_events_select on public.webhook_events for select to authenticated
  using (agency_id is not null and app.has_permission(agency_id, 'integrations.manage'));
create policy external_reference_mappings_select on public.external_reference_mappings for select to authenticated
  using (app.has_permission(agency_id, 'integrations.manage') or app.has_permission(agency_id, 'finance.read'));

-- ---------------------------------------------------------------------------
-- Storage: private buckets; object path = {agency_id}/{document_id}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function app.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create or replace function app.can_upload_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document_id and d.archived_at is null
      and (app.has_permission(d.agency_id, 'documents.upload')
           or (d.owner_type = 'worker' and app.is_worker_self(d.worker_id)))
  )
$$;
grant execute on function app.try_uuid(text) to authenticated, service_role;
grant execute on function app.can_upload_document(uuid) to authenticated, service_role;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and app.can_read_document(app.try_uuid((storage.foldername(name))[2])));
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents'
              and app.can_upload_document(app.try_uuid((storage.foldername(name))[2]))
              and exists (select 1 from public.documents d
                          where d.id = app.try_uuid((storage.foldername(name))[2])
                            and d.agency_id = app.try_uuid((storage.foldername(name))[1])));
-- No update/delete policies: stored versions are immutable.

-- Avatars: {agency_id}/{worker_id}/{file}; the worker and staff with workers.read.
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and exists (
    select 1 from public.workers w
    where w.id = app.try_uuid((storage.foldername(name))[2])
      and (w.user_id = auth.uid() or app.has_permission(w.agency_id, 'workers.read'))));
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and exists (
    select 1 from public.workers w
    where w.id = app.try_uuid((storage.foldername(name))[2])
      and w.agency_id = app.try_uuid((storage.foldername(name))[1])
      and (w.user_id = auth.uid() or app.has_permission(w.agency_id, 'workers.write'))));

-- ---------------------------------------------------------------------------
-- Agency bootstrap (service role only) — creates the tenant, its settings,
-- the default configurable industries and document types, and the owner.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_agency(p_name text, p_slug text, p_owner_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency uuid;
  v_owner_role uuid;
begin
  if not app.is_service_role() and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'bootstrap_agency may only be called with the service role' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_owner_user_id) then
    raise exception 'Owner user % has no profile', p_owner_user_id using errcode = 'P0002';
  end if;

  insert into public.agencies (name, slug) values (p_name, lower(p_slug)) returning id into v_agency;
  insert into public.agency_settings (agency_id) values (v_agency);

  insert into public.industries (agency_id, name, slug, sort_order)
  select v_agency, n, s, o from (values
    ('Hospitality', 'hospitality', 10), ('Events', 'events', 20), ('Logistics', 'logistics', 30),
    ('Cleaning', 'cleaning', 40), ('Retail', 'retail', 50), ('Construction', 'construction', 60),
    ('Healthcare', 'healthcare', 70), ('Office administration', 'office-administration', 80),
    ('Catering', 'catering', 90), ('Facilities management', 'facilities-management', 100)
  ) as t(n, s, o);

  insert into public.document_types (agency_id, key, name, applies_to, required_for_engagement, requires_expiry, is_sensitive, client_visible)
  values
    (v_agency, 'identity_verification', 'Identity verification record', 'worker', array['employee', 'freelancer']::public.engagement_type[], true, true, false),
    (v_agency, 'work_eligibility', 'Work eligibility evidence', 'worker', array['employee', 'freelancer']::public.engagement_type[], true, true, false),
    (v_agency, 'resume', 'CV / résumé', 'worker', null, false, false, false),
    (v_agency, 'certificate', 'Certificate', 'worker', null, true, false, false),
    (v_agency, 'qualification', 'Qualification', 'worker', null, false, false, false),
    (v_agency, 'employment_contract', 'Employment contract', 'worker', null, false, true, false),
    (v_agency, 'payslip', 'Payslip', 'worker', null, false, true, false),
    (v_agency, 'kvk_extract', 'Chamber of Commerce (KvK) extract', 'freelancer_business', array['freelancer']::public.engagement_type[], false, false, false),
    (v_agency, 'liability_insurance', 'Liability insurance policy', 'freelancer_business', null, true, false, false),
    (v_agency, 'freelancer_agreement', 'Freelancer agreement', 'freelancer_business', null, false, false, false),
    (v_agency, 'client_contract', 'Client contract', 'client', null, false, false, true),
    (v_agency, 'client_invoice', 'Client invoice (PDF)', 'client', null, false, false, true),
    (v_agency, 'application_resume', 'Applicant CV', 'application', null, false, false, false);

  select id into v_owner_role from public.roles where key = 'agency_owner' and agency_id is null;
  insert into public.user_roles (agency_id, user_id, role_id) values (v_agency, p_owner_user_id, v_owner_role);

  return v_agency;
end;
$$;
revoke all on function public.bootstrap_agency(text, text, uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_agency(text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Hardening
-- ---------------------------------------------------------------------------
-- Internal helpers are callable only where explicitly granted above.
revoke execute on all functions in schema app from public;
grant execute on function app.is_service_role(), app.is_privileged(), app.is_agency_member(uuid), app.has_permission(uuid, text),
  app.staff_agency_ids(), app.is_client_member(uuid), app.client_can(uuid, text), app.client_location_allowed(uuid, uuid),
  app.member_client_ids(), app.is_worker_self(uuid), app.my_worker_ids(), app.is_agency_participant(uuid),
  app.can_read_document(uuid), app.can_read_document_row(uuid, uuid, uuid, uuid, timestamptz), app.can_upload_document(uuid), app.is_conversation_participant(uuid), app.try_uuid(text)
  to authenticated, service_role;

-- The anonymous role may only read published job openings.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.job_openings to anon;

-- Tables with no API access at all.
revoke all on public.invoice_sequences from authenticated;
revoke all on public.automation_jobs from authenticated;

-- Fail the migration if any table in public lacks RLS.
do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ') into v_missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_missing is not null then
    raise exception 'RLS is not enabled on: %', v_missing;
  end if;
end $$;
