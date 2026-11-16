-- ============================================================================
-- ShiftPilot — 0013 Compliance, GDPR and incidents
--
-- Compliance rules are configurable and versioned. The system records checks
-- and human decisions; it never auto-approves classification, regulated
-- positions or work eligibility. Nothing here constitutes legal advice.
-- ============================================================================

create table public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  rule_key text not null check (rule_key ~ '^[a-z0-9_.]{3,80}$'),
  version integer not null check (version > 0),
  category text not null check (category in ('work_eligibility', 'classification', 'working_time', 'minimum_wage',
                                             'equal_treatment', 'certification', 'health_safety', 'registration', 'other')),
  name text not null,
  description text not null,
  -- Machine-readable parameters, e.g. {"max_shift_minutes": 720, "min_rest_minutes": 660}.
  -- Values must be entered by the agency from an authoritative source.
  parameters jsonb not null default '{}'::jsonb,
  severity text not null default 'blocking' check (severity in ('blocking', 'warning', 'informational')),
  source_reference text not null,
  effective_from date not null,
  effective_to date,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, rule_key, version),
  unique (agency_id, id),
  check (effective_to is null or effective_to >= effective_from),
  check (status = 'draft' or approved_at is not null)
);

create or replace function app.guard_compliance_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' and
     (to_jsonb(new) - array['status', 'effective_to', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'effective_to', 'updated_at']) then
    raise exception 'Active compliance rules are versioned; create a new version instead of editing' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_compliance_rules_guard before update on public.compliance_rules
  for each row execute function app.guard_compliance_rule();

create table public.eligibility_checks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  check_type text not null check (check_type in ('identity', 'work_eligibility', 'classification', 'certificate', 'regulated_position',
                                                 'registration', 'working_time', 'other')),
  compliance_rule_id uuid,
  subject_reference text,
  result text not null check (result in ('pass', 'fail', 'needs_review', 'not_applicable')),
  details jsonb not null default '{}'::jsonb,
  valid_until date,
  performed_by uuid references public.profiles(id) on delete set null,
  performed_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, compliance_rule_id) references public.compliance_rules(agency_id, id) on delete restrict
);
create index eligibility_checks_worker_idx on public.eligibility_checks (worker_id, check_type, performed_at desc);
create trigger trg_eligibility_checks_append_only before update or delete on public.eligibility_checks
  for each row execute function app.prevent_mutation();

create table public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  review_type text not null check (review_type in ('freelancer_classification', 'regulated_position', 'work_eligibility',
                                                   'assignment_eligibility', 'equal_treatment', 'other')),
  worker_id uuid,
  freelancer_business_id uuid,
  position_id uuid,
  client_id uuid,
  status public.review_outcome not null default 'pending',
  -- e.g. {"positions": [...], "max_hours_per_week": 24} when outcome = restricted
  restrictions jsonb not null default '{}'::jsonb,
  questionnaire jsonb not null default '{}'::jsonb,
  rationale text,
  valid_until date,
  requested_by uuid references public.profiles(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, freelancer_business_id) references public.freelancer_businesses(agency_id, id) on delete restrict,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (status = 'pending' or (decided_by is not null and decided_at is not null and rationale is not null)),
  check (worker_id is not null or freelancer_business_id is not null or position_id is not null or client_id is not null)
);
create index compliance_reviews_worker_idx on public.compliance_reviews (worker_id, review_type, status);

-- Decisions are final; a changed decision requires a new review.
create or replace function app.guard_compliance_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' and to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
    raise exception 'A decided compliance review cannot be changed; open a new review' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_compliance_reviews_guard before update on public.compliance_reviews
  for each row execute function app.guard_compliance_review();

alter table public.freelancer_agreements add column compliance_review_id uuid;
alter table public.freelancer_agreements add constraint freelancer_agreements_review_fk
  foreign key (agency_id, compliance_review_id) references public.compliance_reviews(agency_id, id) on delete restrict;

-- Expiring evidence across documents and credentials (read-only view).
create view public.document_expiries with (security_invoker = true) as
  select d.agency_id, 'document'::text as source, d.id as record_id, d.worker_id, d.client_id,
         d.title, d.expires_on, d.status::text as status
    from public.documents d
   where d.expires_on is not null and d.archived_at is null
  union all
  select c.agency_id, 'worker_certificate', c.id, c.worker_id, null::uuid,
         cert.name, c.expires_on, c.status::text
    from public.worker_certificates c join public.certificates cert on cert.id = c.certificate_id
   where c.expires_on is not null
  union all
  select q.agency_id, 'worker_qualification', q.id, q.worker_id, null::uuid,
         ql.name, q.expires_on, q.status::text
    from public.worker_qualifications q join public.qualifications ql on ql.id = q.qualification_id
   where q.expires_on is not null;

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  incident_type text not null check (incident_type in ('health_safety', 'misconduct', 'complaint', 'damage', 'data_breach', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  occurred_at timestamptz not null,
  client_id uuid,
  location_id uuid,
  shift_id uuid,
  worker_id uuid,
  summary text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'closed')),
  reported_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict
);
create index incidents_agency_idx on public.incidents (agency_id, status, occurred_at desc);

-- ---------------------------------------------------------------------------
-- GDPR
-- ---------------------------------------------------------------------------
create table public.processing_activities (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  purpose text not null,
  lawful_basis text not null check (lawful_basis in ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories text[] not null,
  data_subjects text[] not null,
  recipients text,
  retention_description text not null,
  security_measures text,
  processors text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, name, version)
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  application_id uuid,
  purpose text not null check (purpose in ('location_verification', 'marketing', 'talent_pool', 'whatsapp_messages', 'other')),
  notice_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now(),
  ip_hash text,
  foreign key (agency_id, application_id) references public.applications(agency_id, id) on delete set null (application_id),
  check (user_id is not null or application_id is not null)
);
create index consent_records_user_idx on public.consent_records (user_id, purpose, recorded_at desc);
create trigger trg_consent_records_append_only before update or delete on public.consent_records
  for each row execute function app.prevent_mutation();

create table public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  subject_user_id uuid references public.profiles(id) on delete set null,
  subject_email extensions.citext not null,
  request_type text not null check (request_type in ('access', 'export', 'rectification', 'erasure', 'restriction', 'objection')),
  status text not null default 'received' check (status in ('received', 'verifying', 'in_progress', 'completed', 'rejected')),
  details text,
  due_at timestamptz not null default (now() + interval '1 month'),
  -- Records retained under a legal obligation are listed here instead of being deleted.
  retained_records jsonb not null default '[]'::jsonb,
  outcome text,
  handled_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('completed', 'rejected') or (outcome is not null and completed_at is not null))
);

create table public.data_retention_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  data_category text not null,
  table_name text not null,
  retention_months integer not null check (retention_months between 1 and 1200),
  legal_basis text not null,
  action text not null check (action in ('delete', 'anonymise', 'archive')),
  last_run_at timestamptz,
  last_run_affected integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, data_category, table_name)
);

create table public.breach_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  detected_at timestamptz not null,
  description text not null,
  data_categories text[] not null default '{}',
  approx_subjects integer,
  risk_assessment text,
  reported_to_authority_at timestamptz,
  subjects_notified_at timestamptz,
  measures_taken text,
  status text not null default 'open' check (status in ('open', 'contained', 'closed')),
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select app.attach_standard_triggers('public.compliance_rules');
select app.attach_standard_triggers('public.compliance_reviews');
select app.attach_standard_triggers('public.incidents');
select app.attach_standard_triggers('public.processing_activities');
select app.attach_standard_triggers('public.data_subject_requests');
select app.attach_standard_triggers('public.data_retention_records');
select app.attach_standard_triggers('public.breach_records');

do $$
declare t text;
begin
  foreach t in array array['compliance_rules', 'eligibility_checks', 'compliance_reviews', 'incidents', 'processing_activities',
    'consent_records', 'data_subject_requests', 'data_retention_records', 'breach_records']
  loop
    perform app.attach_audit(('public.' || t)::regclass);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy compliance_rules_select on public.compliance_rules for select to authenticated
  using (app.is_agency_member(agency_id));
create policy compliance_rules_write on public.compliance_rules for all to authenticated
  using (app.has_permission(agency_id, 'compliance.review')) with check (app.has_permission(agency_id, 'compliance.review'));

create policy eligibility_checks_select on public.eligibility_checks for select to authenticated
  using (app.has_permission(agency_id, 'compliance.read') or app.has_permission(agency_id, 'shifts.assign'));
create policy eligibility_checks_insert on public.eligibility_checks for insert to authenticated
  with check (app.has_permission(agency_id, 'compliance.review') and performed_by = auth.uid());

create policy compliance_reviews_select on public.compliance_reviews for select to authenticated
  using (app.has_permission(agency_id, 'compliance.read') or (worker_id is not null and app.is_worker_self(worker_id)));
create policy compliance_reviews_insert on public.compliance_reviews for insert to authenticated
  with check (app.is_agency_member(agency_id) and status = 'pending' and requested_by = auth.uid());
create policy compliance_reviews_update on public.compliance_reviews for update to authenticated
  using (app.has_permission(agency_id, 'compliance.review')) with check (app.has_permission(agency_id, 'compliance.review'));

create policy incidents_select on public.incidents for select to authenticated
  using (app.has_permission(agency_id, 'compliance.read') or app.has_permission(agency_id, 'shifts.read'));
create policy incidents_insert on public.incidents for insert to authenticated
  with check (app.is_agency_member(agency_id) and reported_by = auth.uid());
create policy incidents_update on public.incidents for update to authenticated
  using (app.has_permission(agency_id, 'compliance.review')) with check (app.has_permission(agency_id, 'compliance.review'));

create policy processing_activities_select on public.processing_activities for select to authenticated using (app.is_agency_member(agency_id));
create policy processing_activities_write on public.processing_activities for all to authenticated
  using (app.has_permission(agency_id, 'gdpr.manage')) with check (app.has_permission(agency_id, 'gdpr.manage'));

create policy consent_records_select on public.consent_records for select to authenticated
  using (user_id = auth.uid() or app.has_permission(agency_id, 'gdpr.manage'));
create policy consent_records_insert on public.consent_records for insert to authenticated
  with check (user_id = auth.uid() and app.is_agency_participant(agency_id));

create policy data_subject_requests_select on public.data_subject_requests for select to authenticated
  using (subject_user_id = auth.uid() or app.has_permission(agency_id, 'gdpr.manage'));
create policy data_subject_requests_insert on public.data_subject_requests for insert to authenticated
  with check ((subject_user_id = auth.uid() and status = 'received' and app.is_agency_participant(agency_id))
              or app.has_permission(agency_id, 'gdpr.manage'));
create policy data_subject_requests_update on public.data_subject_requests for update to authenticated
  using (app.has_permission(agency_id, 'gdpr.manage')) with check (app.has_permission(agency_id, 'gdpr.manage'));

create policy data_retention_records_all on public.data_retention_records for all to authenticated
  using (app.has_permission(agency_id, 'gdpr.manage')) with check (app.has_permission(agency_id, 'gdpr.manage'));
create policy breach_records_all on public.breach_records for all to authenticated
  using (app.has_permission(agency_id, 'gdpr.manage')) with check (app.has_permission(agency_id, 'gdpr.manage'));
