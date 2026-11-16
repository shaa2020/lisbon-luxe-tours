-- ============================================================================
-- ShiftPilot — 0015 Rate limiting
-- Fixed-window counters shared by all application instances (serverless-safe).
-- Callable by the service role only; the application hashes identifiers
-- (IP addresses, emails) before using them as keys.
-- ============================================================================

create table public.rate_limit_buckets (
  key text primary key check (length(key) between 3 and 200),
  window_start timestamptz not null,
  hits integer not null check (hits >= 0)
);
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if not app.is_service_role() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit' using errcode = '22023';
  end if;
  insert into public.rate_limit_buckets as b (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when b.window_start < now() - make_interval(secs => p_window_seconds) then 1 else b.hits + 1 end,
        window_start = case when b.window_start < now() - make_interval(secs => p_window_seconds) then now() else b.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Housekeeping helper for a scheduled job.
create or replace function public.purge_rate_limits()
returns integer
language sql
security definer
set search_path = ''
as $$
  with d as (delete from public.rate_limit_buckets where window_start < now() - interval '1 day' returning 1)
  select count(*)::integer from d
$$;
revoke all on function public.purge_rate_limits() from public, anon, authenticated;
grant execute on function public.purge_rate_limits() to service_role;
