-- Transfer customers from user '罗文静' (old owner) to '孙宝峰' (new owner)
-- This script assumes the owner column stores the username string.

UPDATE public.customers
SET owner = '孙宝峰'
WHERE owner = '罗文静';
