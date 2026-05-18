
-- Roles
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users see own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Tours
create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  category_slug text not null,
  duration text not null,
  price_from integer not null default 0,
  image_url text,
  tagline text,
  description text not null default '',
  highlights jsonb not null default '[]'::jsonb,
  itinerary jsonb not null default '[]'::jsonb,
  included jsonb not null default '[]'::jsonb,
  not_included jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tours enable row level security;
create trigger tours_updated before update on public.tours
  for each row execute function public.set_updated_at();

create policy "tours public read" on public.tours
  for select using (published = true or public.has_role(auth.uid(),'admin'));
create policy "tours admin write" on public.tours
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Blog posts
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null default '',
  image_url text,
  category text not null default 'Journal',
  read_time text not null default '5 min read',
  content jsonb not null default '[]'::jsonb,
  comments integer not null default 0,
  shares integer not null default 0,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.blog_posts enable row level security;
create trigger blog_updated before update on public.blog_posts
  for each row execute function public.set_updated_at();

create policy "blog public read" on public.blog_posts
  for select using (published = true or public.has_role(auth.uid(),'admin'));
create policy "blog admin write" on public.blog_posts
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tour_slug text,
  tour_title text,
  customer_name text not null,
  email text not null,
  phone text,
  travel_date date,
  guests integer not null default 1,
  notes text,
  total_estimate integer,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "bookings public insert" on public.bookings for insert with check (true);
create policy "bookings admin read" on public.bookings for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "bookings admin update" on public.bookings for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "bookings admin delete" on public.bookings for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Contact messages
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "contact public insert" on public.contact_messages for insert with check (true);
create policy "contact admin read" on public.contact_messages for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "contact admin update" on public.contact_messages for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "contact admin delete" on public.contact_messages for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- Storage bucket for media
insert into storage.buckets (id, name, public) values ('media','media', true)
  on conflict (id) do nothing;

create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.has_role(auth.uid(),'admin'));
