-- ============================================================================
-- ShiftPilot — 0007 Employment pathway and freelancer pathway
--
-- The two pathways are deliberately separate. Statutory values (minimum wage,
-- CAO wage tables, pension percentages) are NEVER seeded or invented: the
-- agency configures them with a source reference, versioned by effective date.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Configuration: CAO, minimum wage, employer cost profiles
-- ---------------------------------------------------------------------------
create table public.cao_configurations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  version text not null,
  effective_from date not null,
  effective_to date,
  source_reference text not null,
  settings jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, name, version),
  unique (agency_id, id),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.minimum_wage_rates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  country_code char(2) not null default 'NL',
  min_age smallint not null check (min_age between 13 and 99),
  hourly_amount numeric(10,4) not null check (hourly_amount > 0),
  effective_from date not null,
  effective_to date,
  source_reference text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from),
  exclude using gist (
    agency_id with =, country_code with =, min_age with =,
    daterange(effective_from, effective_to, '[]') with &&
  )
);

create table public.employer_cost_profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  -- Estimated employer on-cost as a percentage of gross wage (used only for
  -- ESTIMATED contribution margin, never for payroll).
  cost_percentage numeric(6,3) not null check (cost_percentage between 0 and 300),
  effective_from date not null,
  effective_to date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id),
  check (effective_to is null or effective_to >= effective_from),
  exclude using gist (agency_id with =, name with =, daterange(effective_from, effective_to, '[]') with &&)
);

-- ---------------------------------------------------------------------------
-- Employment
-- ---------------------------------------------------------------------------
create type public.employment_contract_status as enum ('draft', 'pending_signature', 'active', 'ended', 'terminated', 'cancelled');

create table public.employment_contracts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  contract_number text not null,
  contract_kind text not null, -- e.g. agency-clause phase, fixed term, on-call; configured by agency
  cao_configuration_id uuid,
  status public.employment_contract_status not null default 'draft',
  start_date date not null,
  end_date date,
  contracted_hours_per_week numeric(5,2) check (contracted_hours_per_week between 0 and 60),
  signature_method text check (signature_method in ('external_esign', 'wet_ink', 'in_app_acceptance')),
  signed_at timestamptz,
  document_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, cao_configuration_id) references public.cao_configurations(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (agency_id, contract_number),
  unique (agency_id, id),
  check (end_date is null or end_date >= start_date),
  check (status not in ('active', 'ended', 'terminated') or (signed_at is not null and signature_method is not null))
);
create index employment_contracts_worker_idx on public.employment_contracts (worker_id, status);
-- At most one active employment contract per worker at a time.
alter table public.employment_contracts add constraint employment_contracts_no_overlap
  exclude using gist (worker_id with =, daterange(start_date, end_date, '[]') with &&)
  where (status in ('active', 'pending_signature'));

create table public.employment_terms (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  contract_id uuid not null unique,
  holiday_allowance_pct numeric(5,2) check (holiday_allowance_pct between 0 and 100),
  leave_hours_per_year numeric(6,2) check (leave_hours_per_year >= 0),
  pension_applicable boolean not null default false,
  pension_scheme text,
  probation_end_date date,
  notice_period_days integer check (notice_period_days >= 0),
  employer_cost_profile_id uuid,
  additional_terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, contract_id) references public.employment_contracts(agency_id, id) on delete cascade,
  foreign key (agency_id, employer_cost_profile_id) references public.employer_cost_profiles(agency_id, id) on delete restrict
);

create table public.wage_rates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  contract_id uuid not null,
  position_id uuid,
  hourly_gross numeric(10,4) not null check (hourly_gross > 0),
  currency char(3) not null default 'EUR',
  effective_from date not null,
  effective_to date,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, contract_id) references public.employment_contracts(agency_id, id) on delete restrict,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  check (effective_to is null or effective_to >= effective_from),
  exclude using gist (
    worker_id with =,
    (coalesce(position_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    daterange(effective_from, effective_to, '[]') with &&
  )
);
create index wage_rates_worker_idx on public.wage_rates (worker_id, effective_from desc);

create table public.leave_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  contract_id uuid,
  leave_type text not null check (leave_type in ('holiday', 'sick', 'special', 'unpaid', 'other')),
  start_date date not null,
  end_date date not null,
  hours numeric(6,2) check (hours >= 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, contract_id) references public.employment_contracts(agency_id, id) on delete restrict,
  check (end_date >= start_date)
);
create index leave_records_worker_idx on public.leave_records (worker_id, start_date);

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  frequency text not null check (frequency in ('weekly', 'four_weekly', 'monthly')),
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'locked', 'exported', 'closed')),
  locked_at timestamptz,
  locked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id),
  check (period_end >= period_start),
  exclude using gist (agency_id with =, frequency with =, daterange(period_start, period_end, '[]') with &&)
);

-- Pathway integrity: employment records only for employee workers.
create or replace function app.check_worker_engagement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.engagement_type;
  v_expected public.engagement_type := tg_argv[0]::public.engagement_type;
begin
  select engagement_type into v_type from public.workers where id = new.worker_id;
  if v_type is distinct from v_expected then
    raise exception '% records require a worker on the % pathway', tg_table_name, v_expected using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_employment_contracts_pathway before insert or update of worker_id on public.employment_contracts
  for each row execute function app.check_worker_engagement('employee');
create trigger trg_wage_rates_pathway before insert or update of worker_id on public.wage_rates
  for each row execute function app.check_worker_engagement('employee');
create trigger trg_leave_records_pathway before insert or update of worker_id on public.leave_records
  for each row execute function app.check_worker_engagement('employee');

-- ---------------------------------------------------------------------------
-- Freelance
-- ---------------------------------------------------------------------------
create table public.freelancer_businesses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  trade_name text not null,
  legal_form text not null default 'eenmanszaak',
  kvk_number text check (kvk_number is null or kvk_number ~ '^[0-9]{8}$'),
  vat_number text,
  vat_liable boolean not null default true,
  small_business_scheme boolean not null default false, -- KOR
  address_line1 text,
  postal_code text,
  city text,
  country_code char(2) not null default 'NL',
  liability_insurance boolean not null default false,
  liability_insurance_expires_on date,
  status public.record_status not null default 'active',
  -- Classification is decided by an administrative review, never inferred
  -- from KvK registration alone.
  classification_status public.review_outcome not null default 'pending',
  classification_reviewed_by uuid references public.profiles(id) on delete set null,
  classification_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  unique (agency_id, worker_id),
  unique (agency_id, id)
);

alter table public.documents add constraint documents_freelancer_business_fk
  foreign key (agency_id, freelancer_business_id) references public.freelancer_businesses(agency_id, id) on delete restrict;

create table public.freelancer_registrations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  business_id uuid not null,
  registration_type text not null check (registration_type in ('kvk', 'vat', 'insurance', 'professional_register', 'other')),
  reference text not null,
  status public.verification_status not null default 'pending',
  valid_until date,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  document_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, business_id) references public.freelancer_businesses(agency_id, id) on delete cascade,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict
);
create index freelancer_registrations_business_idx on public.freelancer_registrations (business_id);

create table public.freelancer_agreements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  business_id uuid not null,
  agreement_number text not null,
  status public.contract_status not null default 'draft',
  start_date date not null,
  end_date date,
  service_description text not null,
  model_agreement_reference text,
  signed_at timestamptz,
  document_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, business_id) references public.freelancer_businesses(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (agency_id, agreement_number),
  unique (agency_id, id),
  check (end_date is null or end_date >= start_date),
  check (status not in ('active', 'expired', 'terminated') or signed_at is not null)
);

create table public.freelancer_rate_agreements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  agreement_id uuid not null,
  position_id uuid,
  hourly_rate numeric(10,4) check (hourly_rate > 0),
  fixed_fee numeric(12,2) check (fixed_fee > 0),
  currency char(3) not null default 'EUR',
  effective_from date not null,
  effective_to date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, agreement_id) references public.freelancer_agreements(agency_id, id) on delete restrict,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  check (hourly_rate is not null or fixed_fee is not null),
  check (effective_to is null or effective_to >= effective_from),
  exclude using gist (
    agreement_id with =,
    (coalesce(position_id, '00000000-0000-0000-0000-000000000000'::uuid)) with =,
    daterange(effective_from, effective_to, '[]') with &&
  )
);

create or replace function app.check_business_pathway()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select engagement_type from public.workers where id = new.worker_id) <> 'freelancer' then
    raise exception 'Freelancer businesses require a worker on the freelancer pathway' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_freelancer_businesses_pathway before insert or update of worker_id on public.freelancer_businesses
  for each row execute function app.check_business_pathway();

-- Classification fields are compliance-controlled.
create trigger trg_freelancer_businesses_guard before insert or update on public.freelancer_businesses
  for each row execute function app.guard_staff_columns('compliance.review',
    '{"classification_status": "pending", "classification_reviewed_by": null, "classification_reviewed_at": null}');
create trigger trg_freelancer_registrations_guard before insert or update on public.freelancer_registrations
  for each row execute function app.guard_staff_columns('documents.verify',
    '{"status": "pending", "checked_by": null, "checked_at": null}');

-- Rates are immutable once created (close a period and create a new row).
create or replace function app.rate_rows_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Rate records cannot be deleted; end-date them instead' using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - 'effective_to') is distinct from (to_jsonb(old) - 'effective_to')
     or (old.effective_to is not null and new.effective_to is distinct from old.effective_to) then
    raise exception 'Rate records are immutable; only an open end date may be set' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_wage_rates_immutable before update or delete on public.wage_rates
  for each row execute function app.rate_rows_immutable();
create trigger trg_freelancer_rates_immutable before update or delete on public.freelancer_rate_agreements
  for each row execute function app.rate_rows_immutable();
create trigger trg_minimum_wage_immutable before update or delete on public.minimum_wage_rates
  for each row execute function app.rate_rows_immutable();

select app.attach_standard_triggers('public.cao_configurations');
select app.attach_standard_triggers('public.employer_cost_profiles');
select app.attach_standard_triggers('public.employment_contracts');
select app.attach_standard_triggers('public.employment_terms');
select app.attach_standard_triggers('public.leave_records');
select app.attach_standard_triggers('public.payroll_periods');
select app.attach_standard_triggers('public.freelancer_businesses');
select app.attach_standard_triggers('public.freelancer_registrations');
select app.attach_standard_triggers('public.freelancer_agreements');
create trigger trg_wage_rates_agency_immutable before update on public.wage_rates for each row execute function app.prevent_agency_change();
create trigger trg_freelancer_rate_agreements_agency_immutable before update on public.freelancer_rate_agreements for each row execute function app.prevent_agency_change();

do $$
declare t text;
begin
  foreach t in array array['cao_configurations', 'minimum_wage_rates', 'employer_cost_profiles', 'employment_contracts',
    'employment_terms', 'wage_rates', 'leave_records', 'payroll_periods', 'freelancer_businesses',
    'freelancer_registrations', 'freelancer_agreements', 'freelancer_rate_agreements']
  loop
    perform app.attach_audit(('public.' || t)::regclass);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Configuration tables: staff with rates.read; managed with rates.write.
create policy cao_configurations_select on public.cao_configurations for select to authenticated using (app.is_agency_member(agency_id));
create policy cao_configurations_write on public.cao_configurations for all to authenticated
  using (app.has_permission(agency_id, 'agency.settings.manage')) with check (app.has_permission(agency_id, 'agency.settings.manage'));
create policy minimum_wage_rates_select on public.minimum_wage_rates for select to authenticated using (app.is_agency_member(agency_id));
create policy minimum_wage_rates_insert on public.minimum_wage_rates for insert to authenticated with check (app.has_permission(agency_id, 'rates.write'));
create policy minimum_wage_rates_update on public.minimum_wage_rates for update to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));
create policy employer_cost_profiles_select on public.employer_cost_profiles for select to authenticated using (app.has_permission(agency_id, 'rates.read'));
create policy employer_cost_profiles_write on public.employer_cost_profiles for all to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));

-- Employment contracts: staff with workers.read see them; the worker sees own.
create policy employment_contracts_select on public.employment_contracts for select to authenticated
  using (app.has_permission(agency_id, 'workers.read') or app.is_worker_self(worker_id));
create policy employment_contracts_insert on public.employment_contracts for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write'));
create policy employment_contracts_update on public.employment_contracts for update to authenticated
  using (app.has_permission(agency_id, 'workers.write')) with check (app.has_permission(agency_id, 'workers.write'));

create policy employment_terms_select on public.employment_terms for select to authenticated
  using (app.has_permission(agency_id, 'workers.read')
         or exists (select 1 from public.employment_contracts c where c.id = contract_id and app.is_worker_self(c.worker_id)));
create policy employment_terms_write on public.employment_terms for all to authenticated
  using (app.has_permission(agency_id, 'workers.write')) with check (app.has_permission(agency_id, 'workers.write'));

-- Wage rates: finance-level permission or the worker's own rates.
create policy wage_rates_select on public.wage_rates for select to authenticated
  using (app.has_permission(agency_id, 'rates.read') or app.is_worker_self(worker_id));
create policy wage_rates_insert on public.wage_rates for insert to authenticated
  with check (app.has_permission(agency_id, 'rates.write'));
create policy wage_rates_update on public.wage_rates for update to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));

create policy leave_records_select on public.leave_records for select to authenticated
  using (app.has_permission(agency_id, 'workers.read') or app.is_worker_self(worker_id));
create policy leave_records_insert on public.leave_records for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write') or (app.is_worker_self(worker_id) and status = 'requested'));
create policy leave_records_update on public.leave_records for update to authenticated
  using (app.has_permission(agency_id, 'workers.write') or (app.is_worker_self(worker_id) and status = 'requested'))
  with check (app.has_permission(agency_id, 'workers.write') or (app.is_worker_self(worker_id) and status in ('requested', 'cancelled')));

create policy payroll_periods_select on public.payroll_periods for select to authenticated
  using (app.has_permission(agency_id, 'finance.read') or app.has_permission(agency_id, 'payroll.export')
         or exists (select 1 from public.workers w where w.agency_id = payroll_periods.agency_id and w.user_id = auth.uid() and w.engagement_type = 'employee'));
create policy payroll_periods_write on public.payroll_periods for all to authenticated
  using (app.has_permission(agency_id, 'payroll.export')) with check (app.has_permission(agency_id, 'payroll.export'));

-- Freelancer records: staff with workers.read, and the freelancer themself.
create policy freelancer_businesses_select on public.freelancer_businesses for select to authenticated
  using (app.has_permission(agency_id, 'workers.read') or app.has_permission(agency_id, 'finance.read') or app.is_worker_self(worker_id));
create policy freelancer_businesses_insert on public.freelancer_businesses for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write') or app.is_worker_self(worker_id));
create policy freelancer_businesses_update on public.freelancer_businesses for update to authenticated
  using (app.has_permission(agency_id, 'workers.write') or app.has_permission(agency_id, 'compliance.review') or app.is_worker_self(worker_id))
  with check (app.has_permission(agency_id, 'workers.write') or app.has_permission(agency_id, 'compliance.review') or app.is_worker_self(worker_id));

create policy freelancer_registrations_select on public.freelancer_registrations for select to authenticated
  using (app.has_permission(agency_id, 'workers.read')
         or exists (select 1 from public.freelancer_businesses b where b.id = business_id and app.is_worker_self(b.worker_id)));
create policy freelancer_registrations_insert on public.freelancer_registrations for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write')
         or exists (select 1 from public.freelancer_businesses b where b.id = business_id and app.is_worker_self(b.worker_id)));
create policy freelancer_registrations_update on public.freelancer_registrations for update to authenticated
  using (app.has_permission(agency_id, 'workers.write') or app.has_permission(agency_id, 'documents.verify')
         or exists (select 1 from public.freelancer_businesses b where b.id = business_id and app.is_worker_self(b.worker_id)))
  with check (app.has_permission(agency_id, 'workers.write') or app.has_permission(agency_id, 'documents.verify')
         or exists (select 1 from public.freelancer_businesses b where b.id = business_id and app.is_worker_self(b.worker_id)));

create policy freelancer_agreements_select on public.freelancer_agreements for select to authenticated
  using (app.has_permission(agency_id, 'workers.read')
         or exists (select 1 from public.freelancer_businesses b where b.id = business_id and app.is_worker_self(b.worker_id)));
create policy freelancer_agreements_insert on public.freelancer_agreements for insert to authenticated
  with check (app.has_permission(agency_id, 'workers.write'));
create policy freelancer_agreements_update on public.freelancer_agreements for update to authenticated
  using (app.has_permission(agency_id, 'workers.write')) with check (app.has_permission(agency_id, 'workers.write'));

create policy freelancer_rate_agreements_select on public.freelancer_rate_agreements for select to authenticated
  using (app.has_permission(agency_id, 'rates.read')
         or exists (select 1 from public.freelancer_agreements a join public.freelancer_businesses b on b.id = a.business_id
                    where a.id = agreement_id and app.is_worker_self(b.worker_id)));
create policy freelancer_rate_agreements_insert on public.freelancer_rate_agreements for insert to authenticated
  with check (app.has_permission(agency_id, 'rates.write'));
create policy freelancer_rate_agreements_update on public.freelancer_rate_agreements for update to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));
