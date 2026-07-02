-- Allow Japanese staff to share company and work-order handling without changing ownership.
-- Run this in Supabase SQL Editor if RLS is enabled in production.

CREATE OR REPLACE FUNCTION public.is_japanese_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'admin' OR u.country = '日本')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_japanese_staff_or_admin() TO authenticated;

-- companies: Japanese staff can see and maintain all Japanese-side company records.
DROP POLICY IF EXISTS "companies_japanese_staff_shared_select" ON public.companies;
CREATE POLICY "companies_japanese_staff_shared_select" ON public.companies
FOR SELECT TO authenticated
USING (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "companies_japanese_staff_shared_insert" ON public.companies;
CREATE POLICY "companies_japanese_staff_shared_insert" ON public.companies
FOR INSERT TO authenticated
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "companies_japanese_staff_shared_update" ON public.companies;
CREATE POLICY "companies_japanese_staff_shared_update" ON public.companies
FOR UPDATE TO authenticated
USING (public.is_japanese_staff_or_admin())
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "companies_japanese_staff_shared_delete" ON public.companies;
CREATE POLICY "companies_japanese_staff_shared_delete" ON public.companies
FOR DELETE TO authenticated
USING (public.is_japanese_staff_or_admin());

-- work_orders: keep owner_id/owner_name as the creator, but let Japanese staff share handling.
DROP POLICY IF EXISTS "work_orders_japanese_staff_shared_select" ON public.work_orders;
CREATE POLICY "work_orders_japanese_staff_shared_select" ON public.work_orders
FOR SELECT TO authenticated
USING (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_orders_japanese_staff_shared_insert" ON public.work_orders;
CREATE POLICY "work_orders_japanese_staff_shared_insert" ON public.work_orders
FOR INSERT TO authenticated
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_orders_japanese_staff_shared_update" ON public.work_orders;
CREATE POLICY "work_orders_japanese_staff_shared_update" ON public.work_orders
FOR UPDATE TO authenticated
USING (public.is_japanese_staff_or_admin())
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_orders_japanese_staff_shared_delete" ON public.work_orders;
CREATE POLICY "work_orders_japanese_staff_shared_delete" ON public.work_orders
FOR DELETE TO authenticated
USING (public.is_japanese_staff_or_admin());

-- customers linked to work orders are the applicant records shown under Japanese-side work orders.
DROP POLICY IF EXISTS "customers_japanese_staff_work_order_select" ON public.customers;
CREATE POLICY "customers_japanese_staff_work_order_select" ON public.customers
FOR SELECT TO authenticated
USING (public.is_japanese_staff_or_admin() AND work_order_id IS NOT NULL);

DROP POLICY IF EXISTS "customers_japanese_staff_work_order_update" ON public.customers;
CREATE POLICY "customers_japanese_staff_work_order_update" ON public.customers
FOR UPDATE TO authenticated
USING (public.is_japanese_staff_or_admin() AND work_order_id IS NOT NULL)
WITH CHECK (public.is_japanese_staff_or_admin() AND work_order_id IS NOT NULL);

-- Work-order Q&A: Japanese staff can read and answer questions on any Japanese-side work order.
DROP POLICY IF EXISTS "work_order_questions_japanese_staff_shared_select" ON public.work_order_questions;
CREATE POLICY "work_order_questions_japanese_staff_shared_select" ON public.work_order_questions
FOR SELECT TO authenticated
USING (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_order_questions_japanese_staff_shared_update" ON public.work_order_questions;
CREATE POLICY "work_order_questions_japanese_staff_shared_update" ON public.work_order_questions
FOR UPDATE TO authenticated
USING (public.is_japanese_staff_or_admin())
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_order_answers_japanese_staff_shared_select" ON public.work_order_answers;
CREATE POLICY "work_order_answers_japanese_staff_shared_select" ON public.work_order_answers
FOR SELECT TO authenticated
USING (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_order_answers_japanese_staff_shared_insert" ON public.work_order_answers;
CREATE POLICY "work_order_answers_japanese_staff_shared_insert" ON public.work_order_answers
FOR INSERT TO authenticated
WITH CHECK (public.is_japanese_staff_or_admin());

DROP POLICY IF EXISTS "work_order_answers_japanese_staff_shared_update" ON public.work_order_answers;
CREATE POLICY "work_order_answers_japanese_staff_shared_update" ON public.work_order_answers
FOR UPDATE TO authenticated
USING (public.is_japanese_staff_or_admin())
WITH CHECK (public.is_japanese_staff_or_admin());
