create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  field text not null,
  locale text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  unique (table_name, record_id, field, locale)
);

create index idx_content_translations_lookup
  on public.content_translations (table_name, record_id, locale);

grant select on public.content_translations to anon, authenticated;
grant all on public.content_translations to service_role;
grant select, insert, update, delete on public.content_translations to authenticated;

alter table public.content_translations enable row level security;

create policy "Anyone can read content translations"
  on public.content_translations for select
  to anon, authenticated
  using (true);

create policy "Staff can manage content translations"
  on public.content_translations for all
  to authenticated
  using (authz.has_min_role(auth.uid(), 'staff'::app_role))
  with check (authz.has_min_role(auth.uid(), 'staff'::app_role));
