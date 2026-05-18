create table if not exists public.site_settings (
  id boolean primary key default true,
  brand_name text not null default 'Luz de',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create trigger site_settings_updated
before update on public.site_settings
for each row execute function public.set_updated_at();

create policy "site settings public read"
on public.site_settings
for select to public
using (id = true);

create policy "site settings admin write"
on public.site_settings
for all to authenticated
using (private.has_role(auth.uid(), 'admin'))
with check (private.has_role(auth.uid(), 'admin'));

insert into public.site_settings (id, brand_name)
values (true, 'Luz de')
on conflict (id) do update set brand_name = excluded.brand_name;