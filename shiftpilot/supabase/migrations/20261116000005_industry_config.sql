-- ============================================================================
-- ShiftPilot — 0005 Industries, job positions and requirements
-- All job configuration is data; no positions are hard-coded in application
-- logic. Default industries are seeded per agency by bootstrap_agency().
-- ============================================================================

create table public.industries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  description text,
  status public.record_status not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, slug),
  unique (agency_id, id)
);

create table public.rate_categories (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  kind text not null check (kind in ('pay', 'billing')),
  code text not null check (code ~ '^[A-Z0-9_-]{1,30}$'),
  name text not null,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, kind, code),
  unique (agency_id, id)
);

create table public.job_categories (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  industry_id uuid not null,
  name text not null,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict,
  unique (agency_id, industry_id, name),
  unique (agency_id, id)
);

create table public.job_positions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  industry_id uuid not null,
  category_id uuid,
  name text not null,
  description text,
  default_dress_code text,
  safety_requirements text,
  pay_category_id uuid,
  billing_category_id uuid,
  -- Positions flagged regulated always require manual compliance review
  -- before a worker becomes eligible (never auto-approved).
  is_regulated boolean not null default false,
  allows_freelancers boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict,
  foreign key (agency_id, category_id) references public.job_categories(agency_id, id) on delete restrict,
  foreign key (agency_id, pay_category_id) references public.rate_categories(agency_id, id) on delete restrict,
  foreign key (agency_id, billing_category_id) references public.rate_categories(agency_id, id) on delete restrict,
  unique (agency_id, industry_id, name),
  unique (agency_id, id)
);
create index job_positions_industry_idx on public.job_positions (agency_id, industry_id, status);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  category text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, name),
  unique (agency_id, id)
);

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  description text,
  requires_document boolean not null default true,
  is_regulated boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, name),
  unique (agency_id, id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  name text not null,
  issuing_body text,
  validity_months integer check (validity_months between 1 and 240),
  is_regulated boolean not null default false,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, name),
  unique (agency_id, id)
);

create type public.requirement_type as enum ('skill', 'qualification', 'certificate', 'language', 'experience', 'safety', 'engagement');

create table public.position_requirements (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  position_id uuid not null,
  requirement_type public.requirement_type not null,
  skill_id uuid,
  qualification_id uuid,
  certificate_id uuid,
  language_code text check (language_code is null or language_code ~ '^[a-z]{2}$'),
  min_language_level text check (min_language_level is null or min_language_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native')),
  min_experience_months integer check (min_experience_months between 0 and 600),
  engagement_type public.engagement_type,
  description text,
  is_mandatory boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete cascade,
  foreign key (agency_id, skill_id) references public.skills(agency_id, id) on delete restrict,
  foreign key (agency_id, qualification_id) references public.qualifications(agency_id, id) on delete restrict,
  foreign key (agency_id, certificate_id) references public.certificates(agency_id, id) on delete restrict,
  check (
    case requirement_type
      when 'skill' then skill_id is not null
      when 'qualification' then qualification_id is not null
      when 'certificate' then certificate_id is not null
      when 'language' then language_code is not null
      when 'experience' then min_experience_months is not null
      when 'safety' then description is not null
      when 'engagement' then engagement_type is not null
    end
  )
);
create index position_requirements_position_idx on public.position_requirements (position_id);

-- Clients and leads can now reference an industry.
alter table public.clients add column industry_id uuid;
alter table public.clients add constraint clients_industry_fk
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict;
alter table public.leads add column industry_id uuid;
alter table public.leads add constraint leads_industry_fk
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict;

select app.attach_standard_triggers('public.industries');
select app.attach_standard_triggers('public.rate_categories');
select app.attach_standard_triggers('public.job_categories');
select app.attach_standard_triggers('public.job_positions');
select app.attach_standard_triggers('public.skills');
select app.attach_standard_triggers('public.qualifications');
select app.attach_standard_triggers('public.certificates');
select app.attach_standard_triggers('public.position_requirements');
select app.attach_audit('public.job_positions');
select app.attach_audit('public.position_requirements');
select app.attach_audit('public.qualifications');
select app.attach_audit('public.certificates');

-- RLS: configuration is readable by anyone participating in the agency
-- (staff, client users for request forms, workers for profile building);
-- writable by staff with industries.manage. No hard deletes of referenced
-- configuration: archive via status instead (FKs use ON DELETE RESTRICT).
do $$
declare
  t text;
begin
  foreach t in array array['industries', 'rate_categories', 'job_categories', 'job_positions', 'skills', 'qualifications', 'certificates', 'position_requirements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (app.is_agency_participant(agency_id))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (app.has_permission(agency_id, %L))',
      t || '_insert', t, 'industries.manage');
    execute format(
      'create policy %I on public.%I for update to authenticated using (app.has_permission(agency_id, %L)) with check (app.has_permission(agency_id, %L))',
      t || '_update', t, 'industries.manage', 'industries.manage');
    execute format(
      'create policy %I on public.%I for delete to authenticated using (app.has_permission(agency_id, %L))',
      t || '_delete', t, 'industries.manage');
  end loop;
end $$;

-- Rate categories reveal internal pay structure; restrict reads to staff.
drop policy rate_categories_select on public.rate_categories;
create policy rate_categories_select on public.rate_categories for select to authenticated
  using (app.is_agency_member(agency_id));
