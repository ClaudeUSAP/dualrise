CREATE OR REPLACE FUNCTION public.admin_search_tournaments_needs_results(
  p_search text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_sort_key text DEFAULT 'startDate',
  p_sort_dir text DEFAULT 'desc',
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 25
) RETURNS TABLE (rows jsonb, total_count int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_offset int := GREATEST(p_page - 1, 0) * p_page_size;
  v_total int;
  v_rows jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT t.*
    FROM public.tournaments t
    WHERE NOT EXISTS (SELECT 1 FROM public.tournament_results r WHERE r.tournament_id = t.id)
      AND (p_search IS NULL OR p_search = '' OR
           t.name ILIKE '%'||p_search||'%' OR
           t.location ILIKE '%'||p_search||'%' OR
           t.country ILIKE '%'||p_search||'%')
      AND (p_type IS NULL OR p_type = 'all' OR t.category = p_type)
      AND (p_country IS NULL OR p_country = 'all' OR t.country = p_country)
      AND (p_gender IS NULL OR p_gender = 'all' OR t.sex = p_gender)
      AND (p_date_from IS NULL OR t.end_date IS NULL OR t.end_date >= p_date_from)
      AND (p_date_to IS NULL OR t.start_date IS NULL OR t.start_date <= p_date_to)
  ),
  ordered AS (
    SELECT * FROM base
    ORDER BY
      CASE WHEN p_sort_key = 'name'      AND p_sort_dir = 'asc'  THEN name      END ASC  NULLS LAST,
      CASE WHEN p_sort_key = 'name'      AND p_sort_dir = 'desc' THEN name      END DESC NULLS LAST,
      CASE WHEN p_sort_key = 'year'      AND p_sort_dir = 'asc'  THEN year      END ASC  NULLS LAST,
      CASE WHEN p_sort_key = 'year'      AND p_sort_dir = 'desc' THEN year      END DESC NULLS LAST,
      CASE WHEN p_sort_key = 'location'  AND p_sort_dir = 'asc'  THEN location  END ASC  NULLS LAST,
      CASE WHEN p_sort_key = 'location'  AND p_sort_dir = 'desc' THEN location  END DESC NULLS LAST,
      CASE WHEN p_sort_key = 'startDate' AND p_sort_dir = 'asc'  THEN start_date END ASC NULLS LAST,
      CASE WHEN (p_sort_key IS NULL OR p_sort_key NOT IN ('name','year','location','startDate')
                 OR (p_sort_key = 'startDate' AND p_sort_dir = 'desc'))
           THEN start_date END DESC NULLS LAST,
      name ASC
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(o.*)), '[]'::jsonb),
    (SELECT COUNT(*)::int FROM base)
  INTO v_rows, v_total
  FROM ordered o;

  rows := v_rows;
  total_count := v_total;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_search_tournaments_needs_results(
  text, text, text, text, date, date, text, text, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_search_tournaments_needs_results(
  text, text, text, text, date, date, text, text, int, int) TO authenticated;

-- Also add the function to the Database types for TypeScript
COMMENT ON FUNCTION public.admin_search_tournaments_needs_results IS 
'Admin-only RPC to search tournaments that need results (no tournament_results entries).
Returns paginated rows as jsonb and total_count for pagination.
Filters: search (name/location/country ILIKE), type, country, gender, date range.
Sorting: name, year, location, startDate with asc/desc.
Access: admin or agent role required.';

-- Verify the function was created
SELECT proname, prorettype::regtype, prosecdef 
FROM pg_proc 
WHERE proname = 'admin_search_tournaments_needs_results';