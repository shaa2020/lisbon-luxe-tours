create table public.site_status_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  url text not null,
  ok boolean not null,
  status_code int,
  response_ms int,
  error text
);
create index site_status_checks_checked_at_idx on public.site_status_checks (checked_at desc);
alter table public.site_status_checks enable row level security;
grant all on public.site_status_checks to service_role;