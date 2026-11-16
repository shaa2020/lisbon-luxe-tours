-- ============================================================================
-- ShiftPilot — 0010 Attendance and timesheets
--
--  * attendance_events are append-only; server_recorded_at is always set by the
--    database. A device time is stored separately and offline sync is flagged,
--    so offline events are never presented as real-time verified attendance.
--  * Approved timesheets are frozen; corrections are appended as adjustment
--    entries linked to an approved attendance_correction.
-- ============================================================================

insert into public.state_machine_transitions (entity, from_state, to_state) values
  ('timesheet', 'draft', 'submitted'),
  ('timesheet', 'submitted', 'client_approved'), ('timesheet', 'submitted', 'disputed'),
  ('timesheet', 'client_approved', 'agency_approved'), ('timesheet', 'client_approved', 'disputed'),
  ('timesheet', 'disputed', 'submitted'),
  ('timesheet', 'agency_approved', 'locked');

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  assignment_id uuid not null,
  worker_id uuid not null,
  event_type text not null check (event_type in ('check_in', 'check_out', 'break_start', 'break_end')),
  server_recorded_at timestamptz not null default now(),
  device_recorded_at timestamptz,
  is_offline_sync boolean not null default false,
  source text not null check (source in ('worker_app', 'admin_entry', 'kiosk', 'correction')),
  -- Location is stored only when the agency enabled verification and the
  -- worker consented; see agency_settings.location_verification_enabled.
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  location_accuracy_m numeric(8,2) check (location_accuracy_m >= 0),
  location_verified boolean,
  idempotency_key text not null,
  recorded_by uuid references public.profiles(id) on delete set null,
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  unique (worker_id, idempotency_key),
  check ((latitude is null) = (longitude is null)),
  check (not is_offline_sync or device_recorded_at is not null)
);
create index attendance_events_assignment_idx on public.attendance_events (assignment_id, server_recorded_at);
create trigger trg_attendance_events_append_only before update or delete on public.attendance_events
  for each row execute function app.prevent_mutation();

-- Server-authoritative timestamps: callers cannot choose server_recorded_at.
create or replace function app.attendance_server_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_recorded_at := now();
  new.created_at := now();
  return new;
end;
$$;
create trigger trg_attendance_events_server_time before insert on public.attendance_events
  for each row execute function app.attendance_server_time();

create table public.break_records (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  assignment_id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  start_event_id uuid references public.attendance_events(id) on delete restrict,
  end_event_id uuid references public.attendance_events(id) on delete restrict,
  minutes integer generated always as (
    case when ended_at is null then null else (extract(epoch from (ended_at - started_at)) / 60)::integer end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict,
  check (ended_at is null or ended_at >= started_at)
);
create unique index break_records_one_open on public.break_records (assignment_id) where ended_at is null;

create type public.timesheet_status as enum ('draft', 'submitted', 'client_approved', 'disputed', 'agency_approved', 'locked');

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  assignment_id uuid not null unique,
  shift_id uuid not null,
  worker_id uuid not null,
  client_id uuid not null,
  location_id uuid not null,
  status public.timesheet_status not null default 'draft',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  scheduled_break_minutes integer not null default 0,
  actual_start timestamptz,
  actual_end timestamptz,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  worked_minutes integer check (worked_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  late_minutes integer not null default 0 check (late_minutes >= 0),
  early_departure_minutes integer not null default 0 check (early_departure_minutes >= 0),
  has_offline_events boolean not null default false,
  submitted_at timestamptz,
  client_approved_at timestamptz,
  client_approved_by uuid references public.profiles(id) on delete set null,
  agency_approved_at timestamptz,
  agency_approved_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  locked_reason text check (locked_reason in ('invoiced', 'payroll_exported', 'purchase_invoice', 'period_closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict,
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (client_id, location_id) references public.client_locations(client_id, id) on delete restrict,
  unique (agency_id, id),
  check (actual_end is null or actual_start is null or actual_end > actual_start),
  check (status not in ('client_approved', 'agency_approved', 'locked') or (actual_start is not null and actual_end is not null)),
  check (status not in ('agency_approved', 'locked') or (agency_approved_at is not null and client_approved_at is not null))
);
create index timesheets_client_status_idx on public.timesheets (client_id, status);
create index timesheets_worker_idx on public.timesheets (worker_id, scheduled_start desc);
create index timesheets_agency_status_idx on public.timesheets (agency_id, status);

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  timesheet_id uuid not null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requester_type text not null check (requester_type in ('worker', 'client', 'agency')),
  proposed_start timestamptz,
  proposed_end timestamptz,
  proposed_break_minutes integer check (proposed_break_minutes >= 0),
  reason text not null check (length(reason) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (proposed_start is not null or proposed_end is not null or proposed_break_minutes is not null),
  check (proposed_end is null or proposed_start is null or proposed_end > proposed_start),
  check (status in ('pending', 'withdrawn') or (decided_by is not null and decided_at is not null))
);
create index attendance_corrections_timesheet_idx on public.attendance_corrections (timesheet_id);

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  timesheet_id uuid not null,
  entry_kind text not null check (entry_kind in ('regular', 'overtime', 'night', 'weekend', 'public_holiday', 'adjustment')),
  minutes integer not null,
  rate_rule_code text,
  correction_id uuid,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict,
  foreign key (agency_id, correction_id) references public.attendance_corrections(agency_id, id) on delete restrict,
  check (entry_kind = 'adjustment' or minutes >= 0),
  check (entry_kind <> 'adjustment' or correction_id is not null)
);
create index timesheet_entries_timesheet_idx on public.timesheet_entries (timesheet_id);

create table public.timesheet_approvals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  timesheet_id uuid not null,
  approver_type text not null check (approver_type in ('client', 'agency')),
  decision text not null check (decision in ('approved', 'disputed', 'correction_requested')),
  comment text check (length(comment) <= 2000),
  decided_by uuid not null references public.profiles(id) on delete restrict,
  decided_at timestamptz not null default now(),
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict,
  check (decision = 'approved' or comment is not null)
);
create index timesheet_approvals_timesheet_idx on public.timesheet_approvals (timesheet_id, decided_at);
create trigger trg_timesheet_approvals_append_only before update or delete on public.timesheet_approvals
  for each row execute function app.prevent_mutation();

-- ---------------------------------------------------------------------------
-- Immutability of approved timesheets
-- ---------------------------------------------------------------------------
create or replace function app.guard_timesheet_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Timesheets cannot be deleted' using errcode = 'P0001';
  end if;
  if old.status in ('client_approved', 'agency_approved', 'locked') then
    -- Only status progression and its bookkeeping columns may change.
    if (to_jsonb(new) - array['status', 'agency_approved_at', 'agency_approved_by', 'locked_at', 'locked_reason', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['status', 'agency_approved_at', 'agency_approved_by', 'locked_at', 'locked_reason', 'updated_at']) then
      raise exception 'Approved timesheets cannot be modified; submit a correction instead' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_timesheets_guard before update or delete on public.timesheets
  for each row execute function app.guard_timesheet_update();

create or replace function app.guard_timesheet_entries()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.timesheet_status;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select status into v_status from public.timesheets where id = old.timesheet_id;
    if v_status <> 'draft' then
      raise exception 'Timesheet entries are frozen once submitted; add an adjustment instead' using errcode = 'P0001';
    end if;
    return coalesce(new, old);
  end if;
  select status into v_status from public.timesheets where id = new.timesheet_id;
  if v_status = 'locked' then
    raise exception 'Timesheet is locked (invoiced or exported)' using errcode = 'P0001';
  end if;
  if v_status <> 'draft' and new.entry_kind <> 'adjustment' then
    raise exception 'Only adjustment entries can be added after submission' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_timesheet_entries_guard before insert or update or delete on public.timesheet_entries
  for each row execute function app.guard_timesheet_entries();

create trigger trg_timesheets_state before insert or update of status on public.timesheets
  for each row execute function app.enforce_state_machine('timesheet', 'status', 'draft');

select app.attach_standard_triggers('public.break_records');
select app.attach_standard_triggers('public.timesheets');
select app.attach_standard_triggers('public.attendance_corrections');
select app.attach_audit('public.timesheets');
select app.attach_audit('public.timesheet_entries');
select app.attach_audit('public.attendance_corrections');
select app.attach_audit('public.attendance_events');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.attendance_events enable row level security;
alter table public.break_records enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.timesheet_approvals enable row level security;
alter table public.attendance_corrections enable row level security;

-- Attendance: staff, the worker, and client users for their locations.
-- Inserts happen through record_attendance() (worker) or by staff.
create policy attendance_events_select on public.attendance_events for select to authenticated
  using (app.has_permission(agency_id, 'attendance.read') or app.is_worker_self(worker_id)
         or exists (select 1 from public.shift_assignments a join public.shifts s on s.id = a.shift_id
                    where a.id = assignment_id and app.client_location_allowed(s.client_id, s.location_id)));
create policy attendance_events_insert on public.attendance_events for insert to authenticated
  with check (app.has_permission(agency_id, 'attendance.correct') and source in ('admin_entry', 'correction') and recorded_by = auth.uid());

create policy break_records_select on public.break_records for select to authenticated
  using (app.has_permission(agency_id, 'attendance.read')
         or exists (select 1 from public.shift_assignments a where a.id = assignment_id and app.is_worker_self(a.worker_id)));
create policy break_records_write on public.break_records for all to authenticated
  using (app.has_permission(agency_id, 'attendance.correct')) with check (app.has_permission(agency_id, 'attendance.correct'));

create policy timesheets_select on public.timesheets for select to authenticated
  using (app.has_permission(agency_id, 'timesheets.read') or app.is_worker_self(worker_id)
         or (status <> 'draft' and app.client_location_allowed(client_id, location_id)));
create policy timesheets_insert on public.timesheets for insert to authenticated
  with check (app.has_permission(agency_id, 'timesheets.approve'));
create policy timesheets_update on public.timesheets for update to authenticated
  using (app.has_permission(agency_id, 'timesheets.approve')) with check (app.has_permission(agency_id, 'timesheets.approve'));

create policy timesheet_entries_select on public.timesheet_entries for select to authenticated
  using (exists (select 1 from public.timesheets t where t.id = timesheet_id));  -- inherits timesheets RLS
create policy timesheet_entries_write on public.timesheet_entries for insert to authenticated
  with check (app.has_permission(agency_id, 'timesheets.approve'));

create policy timesheet_approvals_select on public.timesheet_approvals for select to authenticated
  using (exists (select 1 from public.timesheets t where t.id = timesheet_id));

create policy attendance_corrections_select on public.attendance_corrections for select to authenticated
  using (exists (select 1 from public.timesheets t where t.id = timesheet_id));
create policy attendance_corrections_insert on public.attendance_corrections for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and exists (
    select 1 from public.timesheets t where t.id = timesheet_id and (
      (requester_type = 'worker' and app.is_worker_self(t.worker_id))
      or (requester_type = 'client' and app.client_can(t.client_id, 'approve') and app.client_location_allowed(t.client_id, t.location_id))
      or (requester_type = 'agency' and app.has_permission(t.agency_id, 'attendance.correct')))));
create policy attendance_corrections_update on public.attendance_corrections for update to authenticated
  using (app.has_permission(agency_id, 'attendance.correct') or (requested_by = auth.uid() and status = 'pending'))
  with check (app.has_permission(agency_id, 'attendance.correct') or (requested_by = auth.uid() and status in ('pending', 'withdrawn')));

-- Decision fields on corrections are staff-only.
create trigger trg_attendance_corrections_guard before insert or update on public.attendance_corrections
  for each row execute function app.guard_staff_columns('attendance.correct',
    '{"decided_by": null, "decided_at": null, "decision_note": null}');
