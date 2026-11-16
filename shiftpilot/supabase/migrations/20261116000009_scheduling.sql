-- ============================================================================
-- ShiftPilot — 0009 Scheduling: requests, shifts, positions, invitations,
-- assignments, eligibility snapshots, rate snapshots, state machine.
--
-- Integrity guarantees enforced by the database (not only the UI):
--   * every status change is validated against the state machine
--   * a worker can never hold two overlapping active assignments
--     (GiST exclusion constraint)
--   * a shift position can never be filled beyond its headcount
--     (row lock on the position + recount inside the transaction)
--   * every status change is recorded in state_transitions (append-only)
-- ============================================================================

create type public.request_status as enum ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'cancelled');
create type public.shift_status as enum ('draft', 'open', 'offered', 'partially_filled', 'filled', 'in_progress',
                                         'completed', 'awaiting_approval', 'approved', 'invoiced', 'cancelled');
create type public.assignment_status as enum ('invited', 'accepted', 'confirmed', 'checked_in', 'checked_out', 'completed',
                                              'declined', 'cancelled', 'no_show', 'replacement_requested', 'replaced', 'disputed');

-- ---------------------------------------------------------------------------
-- State machine definition
-- ---------------------------------------------------------------------------
create table public.state_machine_transitions (
  entity text not null check (entity in ('request', 'shift', 'assignment', 'invitation', 'timesheet', 'invoice')),
  from_state text not null,
  to_state text not null,
  primary key (entity, from_state, to_state)
);

insert into public.state_machine_transitions (entity, from_state, to_state) values
  -- requests
  ('request', 'draft', 'submitted'), ('request', 'draft', 'cancelled'),
  ('request', 'submitted', 'under_review'), ('request', 'submitted', 'accepted'),
  ('request', 'submitted', 'rejected'), ('request', 'submitted', 'cancelled'),
  ('request', 'under_review', 'accepted'), ('request', 'under_review', 'rejected'), ('request', 'under_review', 'cancelled'),
  ('request', 'accepted', 'cancelled'),
  -- shifts
  ('shift', 'draft', 'open'), ('shift', 'draft', 'cancelled'),
  ('shift', 'open', 'draft'), ('shift', 'open', 'offered'), ('shift', 'open', 'partially_filled'),
  ('shift', 'open', 'filled'), ('shift', 'open', 'cancelled'),
  ('shift', 'offered', 'open'), ('shift', 'offered', 'partially_filled'), ('shift', 'offered', 'filled'), ('shift', 'offered', 'cancelled'),
  ('shift', 'partially_filled', 'open'), ('shift', 'partially_filled', 'offered'), ('shift', 'partially_filled', 'filled'),
  ('shift', 'partially_filled', 'in_progress'), ('shift', 'partially_filled', 'cancelled'),
  ('shift', 'filled', 'partially_filled'), ('shift', 'filled', 'offered'), ('shift', 'filled', 'open'),
  ('shift', 'filled', 'in_progress'), ('shift', 'filled', 'cancelled'),
  ('shift', 'in_progress', 'completed'),
  ('shift', 'completed', 'awaiting_approval'),
  ('shift', 'awaiting_approval', 'approved'), ('shift', 'awaiting_approval', 'completed'),
  ('shift', 'approved', 'invoiced'),
  -- assignments
  ('assignment', 'invited', 'accepted'), ('assignment', 'invited', 'declined'), ('assignment', 'invited', 'cancelled'),
  ('assignment', 'accepted', 'confirmed'), ('assignment', 'accepted', 'declined'), ('assignment', 'accepted', 'cancelled'),
  ('assignment', 'confirmed', 'checked_in'), ('assignment', 'confirmed', 'cancelled'), ('assignment', 'confirmed', 'no_show'),
  ('assignment', 'confirmed', 'replacement_requested'),
  ('assignment', 'replacement_requested', 'replaced'), ('assignment', 'replacement_requested', 'confirmed'),
  ('assignment', 'replacement_requested', 'cancelled'),
  ('assignment', 'checked_in', 'checked_out'),
  ('assignment', 'checked_out', 'completed'), ('assignment', 'checked_out', 'disputed'),
  ('assignment', 'completed', 'disputed'),
  ('assignment', 'disputed', 'completed'), ('assignment', 'disputed', 'no_show'),
  ('assignment', 'no_show', 'disputed'),
  -- shift invitations (broadcast offers)
  ('invitation', 'pending', 'accepted'), ('invitation', 'pending', 'declined'),
  ('invitation', 'pending', 'expired'), ('invitation', 'pending', 'withdrawn');

alter table public.state_machine_transitions enable row level security;
create policy state_machine_transitions_select on public.state_machine_transitions for select to authenticated using (true);
create trigger trg_state_machine_transitions_readonly before update or delete on public.state_machine_transitions
  for each row execute function app.prevent_mutation();

create table public.state_transitions (
  id bigint generated always as identity primary key,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  entity text not null,
  entity_id uuid not null,
  from_state text,
  to_state text not null,
  actor_user_id uuid,
  reason text,
  created_at timestamptz not null default now()
);
create index state_transitions_entity_idx on public.state_transitions (entity, entity_id, created_at);
create trigger trg_state_transitions_append_only before update or delete on public.state_transitions
  for each row execute function app.prevent_mutation();

-- Generic status transition validator + history writer.
-- TG_ARGV[0] = entity name, TG_ARGV[1] = status column, TG_ARGV[2] = initial states (comma separated)
create or replace function app.enforce_state_machine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity text := tg_argv[0];
  v_col text := tg_argv[1];
  v_initial text[] := string_to_array(tg_argv[2], ',');
  v_new text := to_jsonb(new) ->> v_col;
  v_old text;
  v_reason text := nullif(current_setting('shiftpilot.transition_reason', true), '');
begin
  if tg_op = 'INSERT' then
    if not (v_new = any (v_initial)) then
      raise exception 'A new % cannot start in state %', v_entity, v_new using errcode = 'P0001';
    end if;
    insert into public.state_transitions (agency_id, entity, entity_id, from_state, to_state, actor_user_id, reason)
    values (new.agency_id, v_entity, new.id, null, v_new, auth.uid(), v_reason);
    return new;
  end if;

  v_old := to_jsonb(old) ->> v_col;
  if v_new is distinct from v_old then
    if not exists (select 1 from public.state_machine_transitions t
                   where t.entity = v_entity and t.from_state = v_old and t.to_state = v_new) then
      raise exception 'Invalid % transition: % → %', v_entity, v_old, v_new using errcode = 'P0001';
    end if;
    insert into public.state_transitions (agency_id, entity, entity_id, from_state, to_state, actor_user_id, reason)
    values (new.agency_id, v_entity, new.id, v_old, v_new, auth.uid(), v_reason);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staffing requests (client → agency)
-- ---------------------------------------------------------------------------
create table public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  location_id uuid not null,
  industry_id uuid,
  position_id uuid not null,
  requested_by uuid references public.profiles(id) on delete set null,
  status public.request_status not null default 'draft',
  headcount integer not null check (headcount between 1 and 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  required_skill_ids uuid[] not null default '{}',
  required_language_code text check (required_language_code is null or required_language_code ~ '^[a-z]{2}$'),
  min_experience_months integer check (min_experience_months between 0 and 600),
  instructions text check (length(instructions) <= 5000),
  is_urgent boolean not null default false,
  -- e.g. {"freq":"weekly","days":[1,3,5],"until":"2027-01-31"}
  recurrence jsonb,
  client_reference text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  cancellation_reason text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (client_id, location_id) references public.client_locations(client_id, id) on delete restrict,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  foreign key (agency_id, industry_id) references public.industries(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '16 hours'),
  check (extract(epoch from (ends_at - starts_at)) / 60 > break_minutes),
  check (status <> 'rejected' or rejection_reason is not null)
);
create index shift_requests_agency_status_idx on public.shift_requests (agency_id, status, starts_at);
create index shift_requests_client_idx on public.shift_requests (client_id, starts_at desc);

-- ---------------------------------------------------------------------------
-- Shifts and positions
-- ---------------------------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  location_id uuid not null,
  shift_request_id uuid,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes between 0 and 240),
  status public.shift_status not null default 'draft',
  dress_code text,
  instructions text check (length(instructions) <= 5000),
  recurrence_group_id uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (client_id, location_id) references public.client_locations(client_id, id) on delete restrict,
  foreign key (agency_id, shift_request_id) references public.shift_requests(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '16 hours'),
  check (extract(epoch from (ends_at - starts_at)) / 60 > break_minutes),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (status <> 'cancelled' or cancellation_reason is not null)
);
create index shifts_agency_time_idx on public.shifts (agency_id, starts_at);
create index shifts_client_time_idx on public.shifts (client_id, starts_at);
create index shifts_status_idx on public.shifts (agency_id, status) where status not in ('invoiced', 'cancelled');

create table public.shift_positions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  shift_id uuid not null,
  position_id uuid not null,
  headcount integer not null check (headcount between 1 and 500),
  filled_count integer not null default 0 check (filled_count >= 0),
  allowed_engagements public.engagement_type[] not null default array['employee']::public.engagement_type[],
  required_skill_ids uuid[] not null default '{}',
  required_language_code text check (required_language_code is null or required_language_code ~ '^[a-z]{2}$'),
  min_experience_months integer check (min_experience_months between 0 and 600),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete cascade,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  unique (agency_id, id),
  unique (shift_id, id),
  check (filled_count <= headcount),
  check (cardinality(allowed_engagements) >= 1)
);
create index shift_positions_shift_idx on public.shift_positions (shift_id);

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------
create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  shift_id uuid not null,
  shift_position_id uuid not null,
  worker_id uuid not null,
  status public.assignment_status not null,
  -- Denormalised from the shift for the overlap constraint; kept in sync by trigger.
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  replaces_assignment_id uuid references public.shift_assignments(id) on delete restrict,
  override_reason text,
  override_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz,
  responded_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancellation_reason text,
  version integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete restrict,
  foreign key (shift_id, shift_position_id) references public.shift_positions(shift_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (ends_at > starts_at),
  check ((override_reason is null) = (override_by is null)),
  -- No double booking: a worker cannot hold two overlapping active assignments.
  constraint shift_assignments_no_double_booking exclude using gist (
    worker_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('accepted', 'confirmed', 'checked_in', 'checked_out', 'completed', 'replacement_requested', 'disputed'))
);
-- One live assignment per worker per shift.
create unique index shift_assignments_one_live_per_shift on public.shift_assignments (shift_id, worker_id)
  where status not in ('declined', 'cancelled', 'replaced');
create index shift_assignments_worker_time_idx on public.shift_assignments (worker_id, starts_at);
create index shift_assignments_position_idx on public.shift_assignments (shift_position_id, status);

-- Broadcast offers to eligible workers ("first to accept").
create table public.shift_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  shift_id uuid not null,
  shift_position_id uuid not null,
  worker_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at timestamptz,
  responded_at timestamptz,
  decline_reason text,
  clarification_request text,
  assignment_id uuid,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete cascade,
  foreign key (shift_id, shift_position_id) references public.shift_positions(shift_id, id) on delete cascade,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict,
  check ((status = 'accepted') = (assignment_id is not null))
);
create unique index shift_invitations_one_pending on public.shift_invitations (shift_position_id, worker_id) where status = 'pending';
create index shift_invitations_worker_idx on public.shift_invitations (worker_id, status);

-- Eligibility evaluation evidence (append-only).
create table public.assignment_eligibility (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  shift_position_id uuid not null,
  worker_id uuid not null,
  assignment_id uuid,
  invitation_id uuid references public.shift_invitations(id) on delete set null,
  is_eligible boolean not null,
  mandatory_failures jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  score numeric(6,2),
  explanation jsonb not null default '{}'::jsonb,
  rules_version text,
  evaluated_by uuid references public.profiles(id) on delete set null,
  evaluated_at timestamptz not null default now(),
  foreign key (agency_id, shift_position_id) references public.shift_positions(agency_id, id) on delete cascade,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete cascade,
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete cascade
);
create index assignment_eligibility_assignment_idx on public.assignment_eligibility (assignment_id);
create trigger trg_assignment_eligibility_append_only before update on public.assignment_eligibility
  for each row execute function app.prevent_mutation();

-- Immutable financial snapshot taken when an assignment is confirmed.
create table public.shift_rate_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  assignment_id uuid not null unique,
  currency char(3) not null default 'EUR',
  client_hourly_rate numeric(10,4) not null check (client_hourly_rate >= 0),
  client_rate_rules jsonb not null default '[]'::jsonb,
  client_rate_card_id uuid,
  worker_pay_basis text not null check (worker_pay_basis in ('employee_wage', 'freelancer_rate')),
  worker_hourly_amount numeric(10,4) check (worker_hourly_amount >= 0),
  worker_fixed_fee numeric(12,2) check (worker_fixed_fee >= 0),
  worker_rate_rules jsonb not null default '[]'::jsonb,
  wage_rate_id uuid,
  freelancer_rate_agreement_id uuid,
  employer_cost_percentage numeric(6,3) check (employer_cost_percentage between 0 and 300),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict,
  check (worker_hourly_amount is not null or worker_fixed_fee is not null),
  check (worker_pay_basis = 'employee_wage' or wage_rate_id is null),
  check (worker_pay_basis = 'freelancer_rate' or freelancer_rate_agreement_id is null)
);
create trigger trg_shift_rate_snapshots_immutable before update or delete on public.shift_rate_snapshots
  for each row execute function app.prevent_mutation();

-- ---------------------------------------------------------------------------
-- Triggers: state machines
-- ---------------------------------------------------------------------------
create trigger trg_shift_requests_state before insert or update of status on public.shift_requests
  for each row execute function app.enforce_state_machine('request', 'status', 'draft,submitted');
create trigger trg_shifts_state before insert or update of status on public.shifts
  for each row execute function app.enforce_state_machine('shift', 'status', 'draft,open');
create trigger trg_shift_assignments_state before insert or update of status on public.shift_assignments
  for each row execute function app.enforce_state_machine('assignment', 'status', 'invited,accepted,confirmed');
create trigger trg_shift_invitations_state before insert or update of status on public.shift_invitations
  for each row execute function app.enforce_state_machine('invitation', 'status', 'pending');

-- Assignment integrity: copy shift times, validate engagement eligibility of
-- the position, enforce headcount under a row lock, bump version.
create or replace function app.shift_assignment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift public.shifts;
  v_pos public.shift_positions;
  v_engagement public.engagement_type;
  v_worker_status public.worker_status;
  v_live integer;
  v_active_states public.assignment_status[] := array['accepted', 'confirmed', 'checked_in', 'checked_out', 'completed', 'replacement_requested', 'disputed']::public.assignment_status[];
begin
  select * into v_shift from public.shifts where id = new.shift_id;
  if tg_op = 'INSERT' or new.shift_id is distinct from old.shift_id then
    new.starts_at := v_shift.starts_at;
    new.ends_at := v_shift.ends_at;
  end if;

  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    if new.worker_id is distinct from old.worker_id or new.shift_position_id is distinct from old.shift_position_id then
      raise exception 'An assignment cannot be moved to another worker or position; create a replacement instead' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if v_shift.status in ('draft', 'in_progress', 'completed', 'awaiting_approval', 'approved', 'invoiced', 'cancelled') then
      raise exception 'Workers cannot be assigned to a shift in status %', v_shift.status using errcode = 'P0001';
    end if;
    select engagement_type, status into v_engagement, v_worker_status from public.workers where id = new.worker_id;
    if v_worker_status <> 'active' then
      raise exception 'Only active workers can be assigned (worker status: %)', v_worker_status using errcode = 'P0001';
    end if;
    select * into v_pos from public.shift_positions where id = new.shift_position_id;
    if not (v_engagement = any (v_pos.allowed_engagements)) then
      raise exception 'This position is not open to % workers', v_engagement using errcode = 'P0001';
    end if;
  end if;

  -- Headcount check when the assignment becomes active.
  if new.status = any (v_active_states)
     and (tg_op = 'INSERT' or not (old.status = any (v_active_states))) then
    select * into v_pos from public.shift_positions where id = new.shift_position_id for update;
    select count(*) into v_live from public.shift_assignments a
     where a.shift_position_id = new.shift_position_id
       and a.status = any (v_active_states)
       and a.id <> new.id;
    if v_live >= v_pos.headcount then
      raise exception 'This position is already fully staffed' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
create trigger trg_shift_assignments_integrity before insert or update on public.shift_assignments
  for each row execute function app.shift_assignment_integrity();

-- Recompute filled counts and auto-advance shift fill status.
create or replace function app.refresh_shift_fill(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.shift_status;
  v_total integer;
  v_filled integer;
  v_has_pending boolean;
  v_target public.shift_status;
begin
  update public.shift_positions p
     set filled_count = (select count(*) from public.shift_assignments a
                         where a.shift_position_id = p.id
                           and a.status in ('accepted', 'confirmed', 'checked_in', 'checked_out', 'completed', 'replacement_requested', 'disputed'))
   where p.shift_id = p_shift_id;

  select status into v_status from public.shifts where id = p_shift_id for update;
  if v_status not in ('open', 'offered', 'partially_filled', 'filled') then
    return;
  end if;

  select coalesce(sum(headcount), 0), coalesce(sum(filled_count), 0) into v_total, v_filled
    from public.shift_positions where shift_id = p_shift_id;
  select exists (select 1 from public.shift_invitations where shift_id = p_shift_id and status = 'pending')
      or exists (select 1 from public.shift_assignments where shift_id = p_shift_id and status = 'invited')
    into v_has_pending;

  v_target := case
    when v_total > 0 and v_filled >= v_total then 'filled'
    when v_filled > 0 then 'partially_filled'
    when v_has_pending then 'offered'
    else 'open'
  end;

  if v_target <> v_status then
    update public.shifts set status = v_target where id = p_shift_id;
  end if;
end;
$$;

create or replace function app.after_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.refresh_shift_fill(coalesce(new.shift_id, old.shift_id));
  return null;
end;
$$;
create trigger trg_shift_assignments_refresh after insert or update of status on public.shift_assignments
  for each row execute function app.after_assignment_change();
create trigger trg_shift_invitations_refresh after insert or update of status on public.shift_invitations
  for each row execute function app.after_assignment_change();

-- Keep assignment times in sync when a shift is rescheduled. The exclusion
-- constraint rejects the reschedule if it would double-book any worker.
create or replace function app.sync_assignment_times()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at then
    if old.status in ('in_progress', 'completed', 'awaiting_approval', 'approved', 'invoiced') then
      raise exception 'A shift that has started cannot be rescheduled' using errcode = 'P0001';
    end if;
    update public.shift_assignments
       set starts_at = new.starts_at, ends_at = new.ends_at
     where shift_id = new.id and status not in ('declined', 'cancelled', 'replaced');
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform set_config('shiftpilot.transition_reason', 'shift cancelled', true);
    update public.shift_invitations set status = 'withdrawn' where shift_id = new.id and status = 'pending';
    update public.shift_assignments
       set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'Shift cancelled: ' || new.cancellation_reason
     where shift_id = new.id and status in ('invited', 'accepted', 'confirmed', 'replacement_requested');
  end if;
  return new;
end;
$$;
create trigger trg_shifts_sync_assignments after update on public.shifts
  for each row execute function app.sync_assignment_times();

select app.attach_standard_triggers('public.shift_requests');
select app.attach_standard_triggers('public.shifts');
select app.attach_standard_triggers('public.shift_positions');
select app.attach_standard_triggers('public.shift_assignments');
select app.attach_standard_triggers('public.shift_invitations');
select app.attach_audit('public.shift_requests');
select app.attach_audit('public.shifts');
select app.attach_audit('public.shift_positions');
select app.attach_audit('public.shift_assignments');
select app.attach_audit('public.shift_rate_snapshots');

-- ---------------------------------------------------------------------------
-- Worker-facing RPCs (atomic, permission-checked)
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_shift_invitation(p_invitation_id uuid, p_accept boolean, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.shift_invitations;
  v_assignment uuid;
begin
  select * into v_inv from public.shift_invitations where id = p_invitation_id for update;
  if not found or not app.is_worker_self(v_inv.worker_id) then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'This invitation is no longer open' using errcode = 'P0001';
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    update public.shift_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'This invitation has expired' using errcode = 'P0001';
  end if;

  if not p_accept then
    update public.shift_invitations
       set status = 'declined', responded_at = now(), decline_reason = left(p_reason, 1000)
     where id = v_inv.id;
    return null;
  end if;

  -- Headcount and double-booking are enforced by the assignment triggers and
  -- the exclusion constraint; any violation aborts the whole transaction.
  insert into public.shift_assignments (agency_id, shift_id, shift_position_id, worker_id, status, starts_at, ends_at,
                                        invited_at, responded_at, created_by)
  values (v_inv.agency_id, v_inv.shift_id, v_inv.shift_position_id, v_inv.worker_id, 'accepted', now(), now() + interval '1 minute',
          v_inv.created_at, now(), auth.uid())
  returning id into v_assignment;

  update public.shift_invitations
     set status = 'accepted', responded_at = now(), assignment_id = v_assignment
   where id = v_inv.id;

  return v_assignment;
exception
  when exclusion_violation then
    raise exception 'You already have a shift that overlaps with this one' using errcode = 'P0001';
  when unique_violation then
    raise exception 'You are already assigned to this shift' using errcode = 'P0001';
end;
$$;
revoke all on function public.respond_to_shift_invitation(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_shift_invitation(uuid, boolean, text) to authenticated;

create or replace function public.respond_to_assignment(p_assignment_id uuid, p_accept boolean, p_reason text default null)
returns public.assignment_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.shift_assignments;
  v_new public.assignment_status;
begin
  select * into v_a from public.shift_assignments where id = p_assignment_id for update;
  if not found or not app.is_worker_self(v_a.worker_id) then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  if v_a.status <> 'invited' then
    raise exception 'This assignment is no longer awaiting your response' using errcode = 'P0001';
  end if;
  v_new := case when p_accept then 'accepted'::public.assignment_status else 'declined'::public.assignment_status end;
  perform set_config('shiftpilot.transition_reason', left(p_reason, 500), true);
  update public.shift_assignments set status = v_new, responded_at = now() where id = v_a.id;
  return v_new;
exception
  when exclusion_violation then
    raise exception 'You already have a shift that overlaps with this one' using errcode = 'P0001';
end;
$$;
revoke all on function public.respond_to_assignment(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_assignment(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.state_transitions enable row level security;
alter table public.shift_requests enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_positions enable row level security;
alter table public.shift_assignments enable row level security;
alter table public.shift_invitations enable row level security;
alter table public.assignment_eligibility enable row level security;
alter table public.shift_rate_snapshots enable row level security;

create policy state_transitions_select on public.state_transitions for select to authenticated
  using (app.has_permission(agency_id, 'shifts.read') or app.has_permission(agency_id, 'requests.read'));

-- Requests: client users with the request capability for that location; staff.
create policy shift_requests_select on public.shift_requests for select to authenticated
  using (app.has_permission(agency_id, 'requests.read') or app.client_location_allowed(client_id, location_id));
create policy shift_requests_insert on public.shift_requests for insert to authenticated
  with check (
    (app.client_can(client_id, 'request') and app.client_location_allowed(client_id, location_id)
       and requested_by = auth.uid() and status in ('draft', 'submitted'))
    or app.has_permission(agency_id, 'requests.review'));
create policy shift_requests_update on public.shift_requests for update to authenticated
  using (app.has_permission(agency_id, 'requests.review')
         or (app.client_can(client_id, 'request') and app.client_location_allowed(client_id, location_id)
             and status in ('draft', 'submitted', 'under_review', 'accepted')))
  with check (app.has_permission(agency_id, 'requests.review')
         or (app.client_can(client_id, 'request') and app.client_location_allowed(client_id, location_id)
             and status in ('draft', 'submitted', 'cancelled')));

-- Clients may only edit drafts, submit them, or cancel; review fields are staff-only.
create or replace function app.guard_request_client_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or app.has_permission(new.agency_id, 'requests.review') then
    return new;
  end if;
  if new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason
     or new.client_id is distinct from old.client_id or new.requested_by is distinct from old.requested_by then
    raise exception 'Review fields can only be changed by the agency' using errcode = '42501';
  end if;
  if old.status <> 'draft' and new.status <> 'cancelled' then
    raise exception 'A submitted request can only be cancelled; contact the agency to change it' using errcode = '42501';
  end if;
  if new.status = 'submitted' and old.status = 'draft' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
create trigger trg_shift_requests_client_guard before update on public.shift_requests
  for each row execute function app.guard_request_client_update();

-- Shifts: staff; client users see shifts at locations they can access;
-- workers see shifts they are invited to or assigned to.
create policy shifts_select on public.shifts for select to authenticated
  using (app.has_permission(agency_id, 'shifts.read')
         or (status <> 'draft' and app.client_location_allowed(client_id, location_id))
         or exists (select 1 from public.shift_assignments a where a.shift_id = shifts.id and app.is_worker_self(a.worker_id))
         or exists (select 1 from public.shift_invitations i where i.shift_id = shifts.id and i.status = 'pending' and app.is_worker_self(i.worker_id)));
create policy shifts_insert on public.shifts for insert to authenticated
  with check (app.has_permission(agency_id, 'shifts.write'));
create policy shifts_update on public.shifts for update to authenticated
  using (app.has_permission(agency_id, 'shifts.write')) with check (app.has_permission(agency_id, 'shifts.write'));

create policy shift_positions_select on public.shift_positions for select to authenticated
  using (exists (select 1 from public.shifts s where s.id = shift_id));  -- inherits shifts RLS
create policy shift_positions_write on public.shift_positions for all to authenticated
  using (app.has_permission(agency_id, 'shifts.write')) with check (app.has_permission(agency_id, 'shifts.write'));

-- Assignments: staff and the assigned worker. Client users use the
-- client_shift_staff() projection (no internal fields).
create policy shift_assignments_select on public.shift_assignments for select to authenticated
  using (app.has_permission(agency_id, 'shifts.read') or app.is_worker_self(worker_id));
create policy shift_assignments_insert on public.shift_assignments for insert to authenticated
  with check (app.has_permission(agency_id, 'shifts.assign') and created_by = auth.uid());
create policy shift_assignments_update on public.shift_assignments for update to authenticated
  using (app.has_permission(agency_id, 'shifts.assign')) with check (app.has_permission(agency_id, 'shifts.assign'));

create policy shift_invitations_select on public.shift_invitations for select to authenticated
  using (app.has_permission(agency_id, 'shifts.read') or app.is_worker_self(worker_id));
create policy shift_invitations_insert on public.shift_invitations for insert to authenticated
  with check (app.has_permission(agency_id, 'shifts.assign') and invited_by = auth.uid());
create policy shift_invitations_update on public.shift_invitations for update to authenticated
  using (app.has_permission(agency_id, 'shifts.assign')) with check (app.has_permission(agency_id, 'shifts.assign'));

create policy assignment_eligibility_select on public.assignment_eligibility for select to authenticated
  using (app.has_permission(agency_id, 'shifts.read'));
create policy assignment_eligibility_insert on public.assignment_eligibility for insert to authenticated
  with check (app.has_permission(agency_id, 'shifts.assign'));

-- Rate snapshots: finance / rates permission only. Never clients or workers
-- (workers see their own compensation through a dedicated projection).
create policy shift_rate_snapshots_select on public.shift_rate_snapshots for select to authenticated
  using (app.has_permission(agency_id, 'rates.read') or app.has_permission(agency_id, 'finance.read'));
create policy shift_rate_snapshots_insert on public.shift_rate_snapshots for insert to authenticated
  with check (app.has_permission(agency_id, 'shifts.assign'));

-- Minimal, privacy-preserving staff list for client users.
create or replace function public.client_shift_staff(p_shift_id uuid)
returns table (assignment_id uuid, worker_display_name text, position_name text, status public.assignment_status)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         coalesce(w.display_name, w.first_name || ' ' || left(w.last_name, 1) || '.'),
         jp.name,
         a.status
  from public.shift_assignments a
  join public.shifts s on s.id = a.shift_id
  join public.workers w on w.id = a.worker_id
  join public.shift_positions sp on sp.id = a.shift_position_id
  join public.job_positions jp on jp.id = sp.position_id
  where a.shift_id = p_shift_id
    and a.status in ('accepted', 'confirmed', 'checked_in', 'checked_out', 'completed', 'replacement_requested', 'disputed', 'no_show')
    and (app.client_location_allowed(s.client_id, s.location_id) or app.has_permission(s.agency_id, 'shifts.read'))
$$;
revoke all on function public.client_shift_staff(uuid) from public, anon;
grant execute on function public.client_shift_staff(uuid) to authenticated;
