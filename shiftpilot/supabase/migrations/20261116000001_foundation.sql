-- ============================================================================
-- ShiftPilot — 0001 Foundation
-- Extensions, private helper schema, shared trigger functions, enums.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- `app` holds internal helper functions used by RLS policies and triggers.
-- It is NOT exposed through the Supabase Data API.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Tighten Supabase's permissive defaults: nothing in `public` is reachable by
-- the anonymous role unless a migration explicitly grants it.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Generic trigger: maintain updated_at
-- ---------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic trigger: block UPDATE/DELETE on append-only tables
-- ---------------------------------------------------------------------------
create or replace function app.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Table %.% is append-only; % is not permitted',
    tg_table_schema, tg_table_name, tg_op
    using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic trigger: agency_id must never change after insert (prevents moving
-- records between tenants).
-- ---------------------------------------------------------------------------
create or replace function app.prevent_agency_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agency_id is distinct from old.agency_id then
    raise exception 'agency_id is immutable on %', tg_table_name
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Helper used by migrations to attach the standard triggers to a table.
create or replace function app.attach_standard_triggers(p_table regclass, p_has_agency boolean default true)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_name text := (select relname from pg_class where oid = p_table);
begin
  if exists (
    select 1 from pg_attribute
    where attrelid = p_table and attname = 'updated_at' and not attisdropped
  ) then
    execute format(
      'create trigger %I before update on %s for each row execute function app.set_updated_at()',
      'trg_' || v_name || '_updated_at', p_table
    );
  end if;
  if p_has_agency then
    execute format(
      'create trigger %I before update on %s for each row execute function app.prevent_agency_change()',
      'trg_' || v_name || '_agency_immutable', p_table
    );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------------
create type public.record_status as enum ('active', 'inactive', 'archived');
create type public.engagement_type as enum ('employee', 'freelancer');
create type public.verification_status as enum ('not_submitted', 'pending', 'verified', 'rejected', 'expired');
create type public.review_outcome as enum ('pending', 'approved', 'restricted', 'rejected');
