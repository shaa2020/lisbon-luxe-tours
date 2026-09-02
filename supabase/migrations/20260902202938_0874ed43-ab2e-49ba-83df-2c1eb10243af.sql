GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "payment gateway secrets deny direct access"
ON public.payment_gateway_secrets
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);