-- 1. Create industries table
CREATE TABLE IF NOT EXISTS public.industries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert standard industry values
INSERT INTO public.industries (name) VALUES
('農業・林業関係'),
('漁業関係'),
('建設関係'),
('食品製造関係'),
('繊維・衣服関係'),
('機械・金属関係'),
('その他')
ON CONFLICT (name) DO NOTHING;

-- 3. Add industry_id column to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES public.industries(id);

-- 4. Migrate existing Company data (Fuzzy Match)
WITH mappings AS (
  SELECT id, name FROM public.industries
)
UPDATE public.companies
SET industry_id = CASE
  WHEN (industry ~* '[农農林]') THEN (SELECT id FROM mappings WHERE name = '農業・林業関係')
  WHEN (industry ~* '[渔漁]') THEN (SELECT id FROM mappings WHERE name = '漁業関係')
  WHEN (industry ~* '建') THEN (SELECT id FROM mappings WHERE name = '建設関係')
  WHEN (industry ~* '食') THEN (SELECT id FROM mappings WHERE name = '食品製造関係')
  WHEN (industry ~* '[纤衣繊維]') THEN (SELECT id FROM mappings WHERE name = '繊維・衣服関係')
  WHEN (industry ~* '[机金機]') THEN (SELECT id FROM mappings WHERE name = '機械・金属関係')
  ELSE (SELECT id FROM mappings WHERE name = 'その他')
END;

-- 5. Add industry_id column to work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS industry_id INTEGER REFERENCES public.industries(id);

-- 6. Migrate existing Work Order data
WITH mappings AS (
  SELECT id, name FROM public.industries
)
UPDATE public.work_orders
SET industry_id = CASE
  WHEN (industry ~* '[农農林]') THEN (SELECT id FROM mappings WHERE name = '農業・林業関係')
  WHEN (industry ~* '[渔漁]') THEN (SELECT id FROM mappings WHERE name = '漁業関係')
  WHEN (industry ~* '建') THEN (SELECT id FROM mappings WHERE name = '建設関係')
  WHEN (industry ~* '食') THEN (SELECT id FROM mappings WHERE name = '食品製造関係')
  WHEN (industry ~* '[纤衣繊維]') THEN (SELECT id FROM mappings WHERE name = '繊維・衣服関係')
  WHEN (industry ~* '[机金機]') THEN (SELECT id FROM mappings WHERE name = '機械・金属関係')
  ELSE (SELECT id FROM mappings WHERE name = 'その他')
END;
