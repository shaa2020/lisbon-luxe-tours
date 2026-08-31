-- API KEYS
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage api keys" ON public.api_keys FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner')) WITH CHECK (public.has_min_role(auth.uid(), 'owner'));
CREATE TRIGGER api_keys_updated BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- API REQUEST LOG (audit + rate limiting)
CREATE TABLE public.api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  key_prefix text,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  ip text,
  user_agent text,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_logs_key_time ON public.api_request_logs (key_prefix, created_at DESC);
CREATE INDEX api_request_logs_ip_time ON public.api_request_logs (ip, created_at DESC);
GRANT SELECT ON public.api_request_logs TO authenticated;
GRANT ALL ON public.api_request_logs TO service_role;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read api logs" ON public.api_request_logs FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'));

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text,
  email text,
  language text NOT NULL DEFAULT 'en',
  number_of_people integer,
  preferred_date date,
  preferred_time text,
  tour_id uuid REFERENCES public.tours(id) ON DELETE SET NULL,
  tour_slug text,
  message text,
  source text NOT NULL DEFAULT 'api',
  status text NOT NULL DEFAULT 'new',
  notes text,
  customer_id uuid REFERENCES public.ops_customers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_created_idx ON public.leads (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'));
CREATE POLICY "Managers write leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'manager')) WITH CHECK (public.has_min_role(auth.uid(), 'manager'));
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ops_customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  display_name text,
  channel text NOT NULL DEFAULT 'whatsapp',
  language text NOT NULL DEFAULT 'en',
  handled_by text NOT NULL DEFAULT 'ai',
  status text NOT NULL DEFAULT 'open',
  source text NOT NULL DEFAULT 'whatsapp_ai',
  external_id text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX conversations_phone_channel ON public.conversations (phone, channel);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read conversations" ON public.conversations FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'));
CREATE POLICY "Managers write conversations" ON public.conversations FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'manager')) WITH CHECK (public.has_min_role(auth.uid(), 'manager'));
CREATE TRIGGER conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONVERSATION MESSAGES
CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender text NOT NULL DEFAULT 'customer',
  body text,
  message_type text NOT NULL DEFAULT 'text',
  language text,
  external_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversation_messages_thread ON public.conversation_messages (conversation_id, sent_at);
CREATE UNIQUE INDEX conversation_messages_external ON public.conversation_messages (external_id) WHERE external_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversation_messages TO service_role;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read conversation messages" ON public.conversation_messages FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'));
CREATE POLICY "Managers write conversation messages" ON public.conversation_messages FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'manager')) WITH CHECK (public.has_min_role(auth.uid(), 'manager'));