
-- Fix function search_path + executability
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Replace public listing of media bucket with no listing (public URLs still work for public buckets)
drop policy if exists "media public read" on storage.objects;

-- Tighten "always true" inserts with light validation
drop policy if exists "bookings public insert" on public.bookings;
create policy "bookings public insert" on public.bookings for insert
  with check (
    char_length(customer_name) between 1 and 200
    and char_length(email) between 3 and 200
    and char_length(coalesce(notes,'')) <= 2000
    and guests between 1 and 50
  );

drop policy if exists "contact public insert" on public.contact_messages;
create policy "contact public insert" on public.contact_messages for insert
  with check (
    char_length(name) between 1 and 200
    and char_length(email) between 3 and 200
    and char_length(message) between 1 and 5000
  );
