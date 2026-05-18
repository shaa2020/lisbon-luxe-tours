create schema if not exists private;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

revoke all on schema private from public;
revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function private.has_role(uuid, public.app_role) from public, anon;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "users see own roles" on public.user_roles;
create policy "users see own roles" on public.user_roles
  for select to authenticated
  using ((user_id = auth.uid()) or private.has_role(auth.uid(), 'admin'));

drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "tours public read" on public.tours;
create policy "tours public read" on public.tours
  for select to public
  using (
    case
      when auth.role() = 'authenticated' then (published = true or private.has_role(auth.uid(), 'admin'))
      else published = true
    end
  );

drop policy if exists "tours admin write" on public.tours;
create policy "tours admin write" on public.tours
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "blog public read" on public.blog_posts;
create policy "blog public read" on public.blog_posts
  for select to public
  using (
    case
      when auth.role() = 'authenticated' then (published = true or private.has_role(auth.uid(), 'admin'))
      else published = true
    end
  );

drop policy if exists "blog admin write" on public.blog_posts;
create policy "blog admin write" on public.blog_posts
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "bookings admin read" on public.bookings;
create policy "bookings admin read" on public.bookings
  for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "bookings admin update" on public.bookings;
create policy "bookings admin update" on public.bookings
  for update to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "bookings admin delete" on public.bookings;
create policy "bookings admin delete" on public.bookings
  for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages
  for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "contact admin update" on public.contact_messages;
create policy "contact admin update" on public.contact_messages
  for update to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "contact admin delete" on public.contact_messages;
create policy "contact admin delete" on public.contact_messages
  for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'));

drop policy if exists "media admin upload" on storage.objects;
create policy "media admin upload" on storage.objects
  for insert to authenticated
  with check ((bucket_id = 'media') and private.has_role(auth.uid(), 'admin'));

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated
  using ((bucket_id = 'media') and private.has_role(auth.uid(), 'admin'));

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated
  using ((bucket_id = 'media') and private.has_role(auth.uid(), 'admin'));