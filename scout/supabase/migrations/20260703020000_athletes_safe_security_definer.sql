-- INCIDENT FIX: athletes_safe MUST be a SECURITY DEFINER view (security_invoker=off).
-- The base table public.athletes is RLS-locked to admin/agent only; coaches read
-- athletes exclusively through this masking view. With security_invoker=on the
-- view runs as the coach and returns ZERO rows (coaches saw no athletes at all).
-- Definer lets the view expose the rows while the CASE has_role(...) expressions
-- mask email / phone / date_of_birth. The advisor "security_definer_view" warning
-- for athletes_safe is INTENTIONAL and accepted. Do NOT set security_invoker=on.
ALTER VIEW public.athletes_safe SET (security_invoker = false);
