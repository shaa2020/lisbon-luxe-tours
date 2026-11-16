-- ============================================================================
-- ShiftPilot — 0011 Financial engine schema
--
-- Separation of concerns:
--   client billing      : client_rate_cards / client_rate_rules / invoices
--   employee wages      : wage_rates (0007) / payroll_exports
--   freelancer costs    : freelancer_rate_agreements (0007) / freelancer_invoices
--   other direct costs  : purchase_invoices
-- Issued invoices are immutable; corrections are made with credit notes.
-- ============================================================================

insert into public.state_machine_transitions (entity, from_state, to_state) values
  ('invoice', 'draft', 'review'), ('invoice', 'review', 'draft'), ('invoice', 'draft', 'cancelled'),
  ('invoice', 'review', 'cancelled'), ('invoice', 'review', 'issued'),
  ('invoice', 'issued', 'partially_paid'), ('invoice', 'issued', 'paid'), ('invoice', 'issued', 'credited'),
  ('invoice', 'partially_paid', 'paid'), ('invoice', 'partially_paid', 'issued'), ('invoice', 'partially_paid', 'credited'),
  ('invoice', 'paid', 'partially_paid'), ('invoice', 'paid', 'issued');

-- ---------------------------------------------------------------------------
-- Client rate cards
-- ---------------------------------------------------------------------------
create table public.client_rate_cards (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  contract_id uuid,
  name text not null,
  currency char(3) not null default 'EUR',
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded')),
  effective_from date not null,
  effective_to date,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, contract_id) references public.client_contracts(agency_id, id) on delete restrict,
  unique (agency_id, id),
  check (effective_to is null or effective_to >= effective_from),
  check (status = 'draft' or approved_at is not null)
);
create index client_rate_cards_client_idx on public.client_rate_cards (client_id, status, effective_from);

create table public.client_rate_rules (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  rate_card_id uuid not null,
  position_id uuid,
  location_id uuid,
  rule_kind text not null check (rule_kind in ('base', 'weekend', 'night', 'public_holiday', 'overtime')),
  hourly_rate numeric(10,4) check (hourly_rate >= 0),
  multiplier numeric(6,4) check (multiplier > 0 and multiplier <= 5),
  days_of_week smallint[] check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]),
  time_from time,
  time_to time,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, rate_card_id) references public.client_rate_cards(agency_id, id) on delete cascade,
  foreign key (agency_id, position_id) references public.job_positions(agency_id, id) on delete restrict,
  check ((hourly_rate is null) <> (multiplier is null)),
  check (rule_kind <> 'base' or hourly_rate is not null),
  check ((time_from is null) = (time_to is null))
);
create index client_rate_rules_card_idx on public.client_rate_rules (rate_card_id);

-- Active rate cards are frozen; changes require a new card version.
create or replace function app.guard_rate_card_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.client_rate_cards where id = coalesce(new.rate_card_id, old.rate_card_id);
  if v_status <> 'draft' then
    raise exception 'Rules of an approved rate card cannot be changed; create a new version' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_client_rate_rules_guard before insert or update or delete on public.client_rate_rules
  for each row execute function app.guard_rate_card_rules();

create or replace function app.guard_rate_card()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'draft' and
     (to_jsonb(new) - array['status', 'effective_to', 'updated_at']) is distinct from (to_jsonb(old) - array['status', 'effective_to', 'updated_at']) then
    raise exception 'Approved rate cards are immutable; only status and end date may change' using errcode = 'P0001';
  end if;
  if old.status = 'superseded' and new.status <> 'superseded' then
    raise exception 'A superseded rate card cannot be reactivated' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_client_rate_cards_guard before update on public.client_rate_cards
  for each row execute function app.guard_rate_card();

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table public.invoice_sequences (
  agency_id uuid not null references public.agencies(id) on delete restrict,
  series text not null check (series ~ '^[A-Z0-9-]{1,16}$'),
  year integer not null check (year between 2000 and 2999),
  next_number integer not null default 1 check (next_number > 0),
  primary key (agency_id, series, year)
);

-- Gapless numbering under a row lock; called only while issuing.
create or replace function app.next_document_number(p_agency_id uuid, p_series text, p_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from p_date)::integer;
  v_number integer;
begin
  insert into public.invoice_sequences (agency_id, series, year) values (p_agency_id, p_series, v_year)
  on conflict do nothing;
  update public.invoice_sequences set next_number = next_number + 1
   where agency_id = p_agency_id and series = p_series and year = v_year
  returning next_number - 1 into v_number;
  return p_series || '-' || v_year::text || '-' || lpad(v_number::text, 5, '0');
end;
$$;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  client_id uuid not null,
  kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  invoice_number text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'issued', 'partially_paid', 'paid', 'credited', 'cancelled')),
  currency char(3) not null default 'EUR',
  period_start date,
  period_end date,
  issue_date date,
  due_date date,
  po_number text,
  subtotal numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  billing_snapshot jsonb,
  notes text check (length(notes) <= 2000),
  pdf_document_id uuid,
  issued_at timestamptz,
  issued_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  sent_to extensions.citext,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, pdf_document_id) references public.documents(agency_id, id) on delete restrict,
  unique (agency_id, id),
  unique (agency_id, invoice_number),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (status in ('draft', 'review', 'cancelled') or (invoice_number is not null and issue_date is not null and due_date is not null and issued_at is not null and billing_snapshot is not null)),
  check (due_date is null or issue_date is null or due_date >= issue_date),
  check (kind = 'invoice' or total <= 0),
  check (kind = 'credit_note' or total >= 0)
);
create index invoices_client_idx on public.invoices (client_id, issue_date desc);
create index invoices_open_idx on public.invoices (agency_id, due_date) where status in ('issued', 'partially_paid');

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  invoice_id uuid not null,
  timesheet_id uuid,
  assignment_id uuid,
  description text not null,
  quantity numeric(12,4) not null,
  unit text not null default 'hour' check (unit in ('hour', 'item', 'day', 'fixed')),
  unit_price numeric(12,4) not null check (unit_price >= 0),
  vat_rate numeric(5,2) not null check (vat_rate between 0 and 100),
  line_subtotal numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  line_vat numeric(14,2) generated always as (round(round(quantity * unit_price, 2) * vat_rate / 100, 2)) stored,
  rate_rule_code text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (agency_id, invoice_id) references public.invoices(agency_id, id) on delete cascade,
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict,
  foreign key (agency_id, assignment_id) references public.shift_assignments(agency_id, id) on delete restrict
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);
create index invoice_items_timesheet_idx on public.invoice_items (timesheet_id) where timesheet_id is not null;

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  original_invoice_id uuid not null,
  credit_invoice_id uuid not null unique,
  reason text not null check (length(reason) between 3 and 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, original_invoice_id) references public.invoices(agency_id, id) on delete restrict,
  foreign key (agency_id, credit_invoice_id) references public.invoices(agency_id, id) on delete restrict
);
create trigger trg_credit_notes_append_only before update or delete on public.credit_notes
  for each row execute function app.prevent_mutation();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  invoice_id uuid not null,
  amount numeric(14,2) not null check (amount <> 0),
  paid_on date not null,
  method text not null check (method in ('bank_transfer', 'direct_debit', 'card', 'cash', 'offset', 'other')),
  reference text,
  reverses_payment_id uuid references public.payments(id) on delete restrict,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, invoice_id) references public.invoices(agency_id, id) on delete restrict,
  check (amount > 0 or reverses_payment_id is not null)
);
create index payments_invoice_idx on public.payments (invoice_id, paid_on);
create trigger trg_payments_append_only before update or delete on public.payments
  for each row execute function app.prevent_mutation();

-- Totals are derived from items and never set by hand.
create or replace function app.recalculate_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invoices i
     set subtotal = coalesce(t.sub, 0),
         vat_total = coalesce(t.vat, 0),
         total = coalesce(t.sub, 0) + coalesce(t.vat, 0)
    from (select sum(line_subtotal) sub, sum(line_vat) vat from public.invoice_items where invoice_id = p_invoice_id) t
   where i.id = p_invoice_id;
end;
$$;

create or replace function app.invoice_items_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status not in ('draft', 'review') and not (tg_op = 'DELETE' and v_status is null) then
    raise exception 'Items of an issued invoice cannot be changed; issue a credit note' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.invoice_id <> old.invoice_id then
    raise exception 'Items cannot move between invoices' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger trg_invoice_items_guard before insert or update or delete on public.invoice_items
  for each row execute function app.invoice_items_changed();

create or replace function app.invoice_items_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.recalculate_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return null;
end;
$$;
create trigger trg_invoice_items_totals after insert or update or delete on public.invoice_items
  for each row execute function app.invoice_items_after();

-- Payments update amount_paid and payment status atomically.
create or replace function app.payments_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.invoices;
  v_paid numeric(14,2);
  v_status text;
begin
  select * into v_inv from public.invoices where id = new.invoice_id for update;
  if v_inv.kind <> 'invoice' or v_inv.status not in ('issued', 'partially_paid', 'paid') then
    raise exception 'Payments can only be recorded against issued invoices' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = new.invoice_id;
  if v_paid < 0 then
    raise exception 'Payment reversal exceeds the amount paid' using errcode = 'P0001';
  end if;
  v_status := case when v_paid >= v_inv.total then 'paid' when v_paid > 0 then 'partially_paid' else 'issued' end;
  update public.invoices set amount_paid = v_paid, status = v_status where id = new.invoice_id;
  return null;
end;
$$;
create trigger trg_payments_after after insert on public.payments
  for each row execute function app.payments_after();

-- Issued invoices: only payment bookkeeping, delivery and PDF may change.
create or replace function app.guard_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' or old.invoice_number is not null then
      raise exception 'Only unnumbered draft invoices can be deleted' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.status not in ('draft', 'review') and
     (to_jsonb(new) - array['status', 'amount_paid', 'sent_at', 'sent_to', 'pdf_document_id', 'updated_at'])
     is distinct from
     (to_jsonb(old) - array['status', 'amount_paid', 'sent_at', 'sent_to', 'pdf_document_id', 'updated_at']) then
    raise exception 'Issued invoices are immutable; issue a credit note instead' using errcode = 'P0001';
  end if;
  if old.pdf_document_id is not null and new.pdf_document_id is distinct from old.pdf_document_id and old.status not in ('draft', 'review') then
    raise exception 'The PDF of an issued invoice cannot be replaced' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_invoices_guard before update or delete on public.invoices
  for each row execute function app.guard_invoice();
create trigger trg_invoices_state before insert or update of status on public.invoices
  for each row execute function app.enforce_state_machine('invoice', 'status', 'draft');

-- ---------------------------------------------------------------------------
-- Payroll exports (employees) — hours and configured wage data only; no
-- statutory payroll calculation is performed by ShiftPilot.
-- ---------------------------------------------------------------------------
create table public.payroll_exports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  payroll_period_id uuid not null,
  format text not null check (format in ('csv', 'loket', 'afas', 'nmbrs', 'other')),
  status text not null default 'generated' check (status in ('generated', 'delivered', 'superseded', 'failed')),
  line_count integer not null default 0,
  totals jsonb not null default '{}'::jsonb,
  document_id uuid,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  delivered_at timestamptz,
  error_message text,
  foreign key (agency_id, payroll_period_id) references public.payroll_periods(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (agency_id, id)
);

create table public.payroll_export_lines (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  payroll_export_id uuid not null,
  worker_id uuid not null,
  timesheet_id uuid not null,
  wage_rate_id uuid,
  hourly_gross numeric(10,4),
  minutes_by_kind jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (agency_id, payroll_export_id) references public.payroll_exports(agency_id, id) on delete cascade,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict,
  unique (payroll_export_id, timesheet_id)
);
create trigger trg_payroll_export_lines_append_only before update or delete on public.payroll_export_lines
  for each row execute function app.prevent_mutation();

-- Uploaded/integrated payslips (documents) per worker and period.
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  worker_id uuid not null,
  payroll_period_id uuid not null,
  document_id uuid not null,
  net_amount numeric(12,2),
  paid_on date,
  source text not null check (source in ('upload', 'integration')),
  created_at timestamptz not null default now(),
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, payroll_period_id) references public.payroll_periods(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (worker_id, payroll_period_id, document_id)
);

-- ---------------------------------------------------------------------------
-- Freelancer purchase invoices (separate from payroll)
-- ---------------------------------------------------------------------------
create table public.freelancer_invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  business_id uuid not null,
  worker_id uuid not null,
  supplier_invoice_number text not null,
  invoice_date date not null,
  period_start date,
  period_end date,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  vat_rate numeric(5,2) not null check (vat_rate between 0 and 100),
  vat_amount numeric(14,2) not null check (vat_amount >= 0),
  total numeric(14,2) not null check (total >= 0),
  payee_iban text not null,
  payee_name text not null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'approved', 'rejected', 'scheduled', 'paid')),
  document_id uuid,
  matched_minutes integer,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_on date,
  payment_reference text,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, business_id) references public.freelancer_businesses(agency_id, id) on delete restrict,
  foreign key (agency_id, worker_id) references public.workers(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (business_id, supplier_invoice_number),
  unique (agency_id, id),
  check (total = subtotal + vat_amount),
  check (status not in ('approved', 'scheduled', 'paid') or approved_at is not null),
  check (status <> 'paid' or paid_on is not null),
  check (status <> 'rejected' or review_note is not null)
);
create index freelancer_invoices_status_idx on public.freelancer_invoices (agency_id, status);

create table public.freelancer_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  freelancer_invoice_id uuid not null,
  timesheet_id uuid,
  description text not null,
  quantity numeric(12,4) not null check (quantity > 0),
  unit_price numeric(12,4) not null check (unit_price >= 0),
  amount numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  matched boolean not null default false,
  mismatch_reason text,
  created_at timestamptz not null default now(),
  foreign key (agency_id, freelancer_invoice_id) references public.freelancer_invoices(agency_id, id) on delete cascade,
  foreign key (agency_id, timesheet_id) references public.timesheets(agency_id, id) on delete restrict
);
-- A timesheet can be claimed by at most one freelancer invoice line.
create unique index freelancer_invoice_lines_timesheet_uidx on public.freelancer_invoice_lines (timesheet_id) where timesheet_id is not null;

create or replace function app.guard_freelancer_invoice()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() or app.has_permission(new.agency_id, 'purchase_invoices.approve') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'submitted';
    new.reviewed_by := null; new.reviewed_at := null; new.approved_by := null; new.approved_at := null;
    new.paid_on := null; new.payment_reference := null; new.review_note := null; new.matched_minutes := null;
    return new;
  end if;
  raise exception 'Submitted invoices can only be changed by the agency' using errcode = '42501';
end;
$$;
create trigger trg_freelancer_invoices_guard before insert or update on public.freelancer_invoices
  for each row execute function app.guard_freelancer_invoice();

create or replace function app.check_freelancer_invoice_pathway()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.freelancer_businesses b join public.workers w on w.id = b.worker_id
                 where b.id = new.business_id and w.id = new.worker_id and w.engagement_type = 'freelancer') then
    raise exception 'Freelancer invoices must come from the freelancer''s own business' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_freelancer_invoices_pathway before insert or update of business_id, worker_id on public.freelancer_invoices
  for each row execute function app.check_freelancer_invoice_pathway();

-- Other direct assignment costs (e.g. transport, equipment) from suppliers.
create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  supplier_name text not null,
  supplier_invoice_number text not null,
  invoice_date date not null,
  category text not null check (category in ('transport', 'equipment', 'training', 'subcontracting', 'other')),
  client_id uuid,
  shift_id uuid,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  vat_amount numeric(14,2) not null check (vat_amount >= 0),
  total numeric(14,2) not null,
  status text not null default 'received' check (status in ('received', 'approved', 'rejected', 'paid')),
  document_id uuid,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_on date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (agency_id, client_id) references public.clients(agency_id, id) on delete restrict,
  foreign key (agency_id, shift_id) references public.shifts(agency_id, id) on delete restrict,
  foreign key (agency_id, document_id) references public.documents(agency_id, id) on delete restrict,
  unique (agency_id, supplier_name, supplier_invoice_number),
  check (total = subtotal + vat_amount)
);

create table public.financial_periods (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check ((status = 'closed') = (closed_at is not null)),
  exclude using gist (agency_id with =, daterange(period_start, period_end, '[]') with &&)
);

-- ---------------------------------------------------------------------------
-- Triggers and RLS
-- ---------------------------------------------------------------------------
select app.attach_standard_triggers('public.client_rate_cards');
select app.attach_standard_triggers('public.client_rate_rules');
select app.attach_standard_triggers('public.invoices');
select app.attach_standard_triggers('public.freelancer_invoices');
select app.attach_standard_triggers('public.purchase_invoices');
select app.attach_standard_triggers('public.financial_periods');
create trigger trg_payroll_exports_agency_immutable before update on public.payroll_exports for each row execute function app.prevent_agency_change();

do $$
declare t text;
begin
  foreach t in array array['client_rate_cards', 'client_rate_rules', 'invoice_sequences', 'invoices', 'invoice_items', 'credit_notes',
    'payments', 'payroll_exports', 'payroll_export_lines', 'payslips', 'freelancer_invoices', 'freelancer_invoice_lines',
    'purchase_invoices', 'financial_periods']
  loop
    if t <> 'invoice_sequences' then
      perform app.attach_audit(('public.' || t)::regclass);
    end if;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Rate cards: finance staff; client users with the finance capability may read
-- active/superseded cards (their contracted pricing) — never wages or margins.
create policy client_rate_cards_select on public.client_rate_cards for select to authenticated
  using (app.has_permission(agency_id, 'rates.read') or (status <> 'draft' and app.client_can(client_id, 'finance')));
create policy client_rate_cards_insert on public.client_rate_cards for insert to authenticated
  with check (app.has_permission(agency_id, 'rates.write'));
create policy client_rate_cards_update on public.client_rate_cards for update to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));
create policy client_rate_rules_select on public.client_rate_rules for select to authenticated
  using (exists (select 1 from public.client_rate_cards c where c.id = rate_card_id));
create policy client_rate_rules_write on public.client_rate_rules for all to authenticated
  using (app.has_permission(agency_id, 'rates.write')) with check (app.has_permission(agency_id, 'rates.write'));

-- invoice_sequences: no API access (only next_document_number()).

create policy invoices_select on public.invoices for select to authenticated
  using (app.has_permission(agency_id, 'finance.read')
         or (status not in ('draft', 'review', 'cancelled') and app.client_can(client_id, 'finance')));
create policy invoices_insert on public.invoices for insert to authenticated
  with check (app.has_permission(agency_id, 'finance.write') and status = 'draft' and invoice_number is null);
create policy invoices_update on public.invoices for update to authenticated
  using (app.has_permission(agency_id, 'finance.write')) with check (app.has_permission(agency_id, 'finance.write'));
create policy invoices_delete on public.invoices for delete to authenticated
  using (app.has_permission(agency_id, 'finance.write') and status = 'draft' and invoice_number is null);

-- Issuing requires invoices.issue, not just finance.write.
create or replace function app.guard_invoice_issue()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if app.is_privileged() then
    return new;
  end if;
  if new.status = 'issued' and old.status = 'review' and not app.has_permission(new.agency_id, 'invoices.issue') then
    raise exception 'You are not authorised to issue invoices' using errcode = '42501';
  end if;
  if new.invoice_number is distinct from old.invoice_number then
    raise exception 'Invoice numbers are assigned by the system' using errcode = '42501';
  end if;
  if new.status in ('paid', 'partially_paid') and new.status is distinct from old.status then
    raise exception 'Payment status is derived from recorded payments' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_invoices_issue_guard before update on public.invoices
  for each row execute function app.guard_invoice_issue();

create policy invoice_items_select on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy invoice_items_write on public.invoice_items for all to authenticated
  using (app.has_permission(agency_id, 'finance.write')) with check (app.has_permission(agency_id, 'finance.write'));

create policy credit_notes_select on public.credit_notes for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = credit_invoice_id));
create policy credit_notes_insert on public.credit_notes for insert to authenticated
  with check (app.has_permission(agency_id, 'invoices.issue'));

create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));
create policy payments_insert on public.payments for insert to authenticated
  with check (app.has_permission(agency_id, 'payments.record') and recorded_by = auth.uid());

create policy payroll_exports_select on public.payroll_exports for select to authenticated
  using (app.has_permission(agency_id, 'payroll.export'));
create policy payroll_exports_write on public.payroll_exports for all to authenticated
  using (app.has_permission(agency_id, 'payroll.export')) with check (app.has_permission(agency_id, 'payroll.export'));
create policy payroll_export_lines_select on public.payroll_export_lines for select to authenticated
  using (app.has_permission(agency_id, 'payroll.export'));
create policy payroll_export_lines_insert on public.payroll_export_lines for insert to authenticated
  with check (app.has_permission(agency_id, 'payroll.export'));

create policy payslips_select on public.payslips for select to authenticated
  using (app.has_permission(agency_id, 'payroll.export') or app.is_worker_self(worker_id));
create policy payslips_insert on public.payslips for insert to authenticated
  with check (app.has_permission(agency_id, 'payroll.export'));

create policy freelancer_invoices_select on public.freelancer_invoices for select to authenticated
  using (app.has_permission(agency_id, 'finance.read') or app.has_permission(agency_id, 'purchase_invoices.approve') or app.is_worker_self(worker_id));
create policy freelancer_invoices_insert on public.freelancer_invoices for insert to authenticated
  with check ((app.is_worker_self(worker_id) and submitted_by = auth.uid()) or app.has_permission(agency_id, 'purchase_invoices.approve'));
create policy freelancer_invoices_update on public.freelancer_invoices for update to authenticated
  using (app.has_permission(agency_id, 'purchase_invoices.approve')) with check (app.has_permission(agency_id, 'purchase_invoices.approve'));

create policy freelancer_invoice_lines_select on public.freelancer_invoice_lines for select to authenticated
  using (exists (select 1 from public.freelancer_invoices f where f.id = freelancer_invoice_id));
create policy freelancer_invoice_lines_insert on public.freelancer_invoice_lines for insert to authenticated
  with check (exists (select 1 from public.freelancer_invoices f where f.id = freelancer_invoice_id
                      and (app.has_permission(f.agency_id, 'purchase_invoices.approve')
                           or (app.is_worker_self(f.worker_id) and f.status = 'submitted'))));
create policy freelancer_invoice_lines_update on public.freelancer_invoice_lines for update to authenticated
  using (app.has_permission(agency_id, 'purchase_invoices.approve')) with check (app.has_permission(agency_id, 'purchase_invoices.approve'));

create policy purchase_invoices_select on public.purchase_invoices for select to authenticated
  using (app.has_permission(agency_id, 'finance.read'));
create policy purchase_invoices_write on public.purchase_invoices for all to authenticated
  using (app.has_permission(agency_id, 'finance.write')) with check (app.has_permission(agency_id, 'finance.write'));

create policy financial_periods_select on public.financial_periods for select to authenticated
  using (app.has_permission(agency_id, 'finance.read'));
create policy financial_periods_write on public.financial_periods for all to authenticated
  using (app.has_permission(agency_id, 'finance.write')) with check (app.has_permission(agency_id, 'finance.write'));
