-- ============================================================================
-- ShiftPilot — 0012 Communication: notifications, delivery log, messaging,
-- automation job queue.
--
-- Delivery state is only ever set from a provider response; nothing marks a
-- message as delivered without one.
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type ~ '^[a-z_]+(\.[a-z_]+)*$'),
  title text not null,
  body text,
  link_path text check (link_path is null or link_path ~ '^/[^/]'),
  entity_type text,
  entity_id uuid,
  idempotency_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_user_id, idempotency_key)
);
create index notifications_recipient_idx on public.notifications (recipient_user_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_user_id) where read_at is null;

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  event_type text not null,
  channel text not null check (channel in ('in_app', 'email', 'push', 'whatsapp')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, agency_id, event_type, channel)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  disabled_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id) where disabled_at is null;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  notification_id uuid references public.notifications(id) on delete set null,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  channel text not null check (channel in ('email', 'push', 'whatsapp')),
  destination_hash text,
  template_key text,
  idempotency_key text not null unique,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'failed', 'skipped_unconfigured', 'skipped_preference', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  provider text,
  provider_message_id text,
  provider_response jsonb,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('sent', 'delivered') or provider_message_id is not null)
);
create index notification_deliveries_queue_idx on public.notification_deliveries (next_attempt_at) where status in ('queued', 'failed');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  subject text,
  context_type text check (context_type in ('shift', 'assignment', 'request', 'timesheet', 'general')),
  context_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, id)
);

create table public.conversation_participants (
  conversation_id uuid not null,
  agency_id uuid not null references public.agencies(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  foreign key (agency_id, conversation_id) references public.conversations(agency_id, id) on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  conversation_id uuid not null,
  sender_user_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(body) between 1 and 5000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  foreign key (agency_id, conversation_id) references public.conversations(agency_id, id) on delete cascade
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete cascade,
  job_type text not null check (job_type ~ '^[a-z_]+(\.[a-z_]+)*$'),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'dead', 'cancelled')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index automation_jobs_queue_idx on public.automation_jobs (run_after) where status in ('queued', 'failed');

-- Claim jobs with SKIP LOCKED so concurrent workers never process the same job.
create or replace function public.claim_automation_jobs(p_worker text, p_limit integer default 10)
returns setof public.automation_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_service_role() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return query
  update public.automation_jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
   where j.id in (
     select id from public.automation_jobs
      where status in ('queued', 'failed') and run_after <= now() and attempts < max_attempts
      order by run_after
      limit greatest(1, least(p_limit, 100))
      for update skip locked)
  returning j.*;
end;
$$;
revoke all on function public.claim_automation_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_automation_jobs(text, integer) to service_role;

create or replace function public.claim_notification_deliveries(p_limit integer default 25)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_service_role() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return query
  update public.notification_deliveries d
     set status = 'sending', attempts = d.attempts + 1
   where d.id in (
     select id from public.notification_deliveries
      where status in ('queued', 'failed') and next_attempt_at <= now() and attempts < max_attempts
      order by next_attempt_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked)
  returning d.*;
end;
$$;
revoke all on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer) to service_role;

select app.attach_standard_triggers('public.notification_deliveries');
select app.attach_standard_triggers('public.conversations');
select app.attach_standard_triggers('public.automation_jobs', false);
create trigger trg_notification_preferences_updated before update on public.notification_preferences
  for each row execute function app.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.automation_jobs enable row level security;

-- Notifications are created server-side (service role / definer functions).
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid()) with check (recipient_user_id = auth.uid());
create or replace function app.guard_notification_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not app.is_privileged() and (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Only the read state of a notification can be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_notifications_guard before update on public.notifications
  for each row execute function app.guard_notification_update();

create policy notification_preferences_all on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and app.is_agency_participant(agency_id));

create policy push_subscriptions_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notification_deliveries_select on public.notification_deliveries for select to authenticated
  using (app.has_permission(agency_id, 'notifications.manage'));

create or replace function app.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversation_participants p
                 where p.conversation_id = p_conversation_id and p.user_id = auth.uid())
$$;
grant execute on function app.is_conversation_participant(uuid) to authenticated;

create policy conversations_select on public.conversations for select to authenticated
  using (app.is_conversation_participant(id) or app.has_permission(agency_id, 'shifts.read'));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (created_by = auth.uid() and app.is_agency_participant(agency_id));
create policy conversation_participants_select on public.conversation_participants for select to authenticated
  using (app.is_conversation_participant(conversation_id) or app.has_permission(agency_id, 'shifts.read'));
create policy conversation_participants_insert on public.conversation_participants for insert to authenticated
  with check (app.is_agency_member(agency_id)
              or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()));
-- Internal messages are visible to agency staff only.
create policy messages_select on public.messages for select to authenticated
  using ((not is_internal and app.is_conversation_participant(conversation_id))
         or app.is_agency_member(agency_id) and (app.is_conversation_participant(conversation_id) or app.has_permission(agency_id, 'shifts.read')));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_user_id = auth.uid() and app.is_conversation_participant(conversation_id)
              and (not is_internal or app.is_agency_member(agency_id)));

-- automation_jobs: service role only (no policies for authenticated).
