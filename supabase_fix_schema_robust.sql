-- 1. Drop the view first to remove dependencies
DROP VIEW IF EXISTS public.vw_custo_pivo;

-- 2. Ensure the 'pivos' table exists
CREATE TABLE IF NOT EXISTS public.pivos (
    temp_id UUID DEFAULT gen_random_uuid()
);

-- 3. Add 'id' column if it is missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'id') THEN
        ALTER TABLE public.pivos ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

-- 4. Add other columns if they are missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'nome') THEN
        ALTER TABLE public.pivos ADD COLUMN nome TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'area') THEN
        ALTER TABLE public.pivos ADD COLUMN area NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'headcount') THEN
        ALTER TABLE public.pivos ADD COLUMN headcount INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'custo_total_calculado') THEN
        ALTER TABLE public.pivos ADD COLUMN custo_total_calculado NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'trabalhadores_min') THEN
        ALTER TABLE public.pivos ADD COLUMN trabalhadores_min INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'trabalhadores_ideal') THEN
        ALTER TABLE public.pivos ADD COLUMN trabalhadores_ideal INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'trabalhadores_max') THEN
        ALTER TABLE public.pivos ADD COLUMN trabalhadores_max INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'custos_adicionais') THEN
        ALTER TABLE public.pivos ADD COLUMN custos_adicionais NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pivos' AND column_name = 'position') THEN
        ALTER TABLE public.pivos ADD COLUMN position JSONB;
    END IF;
END $$;

-- 5. Clean up temp column if it exists (from step 2)
ALTER TABLE public.pivos DROP COLUMN IF EXISTS temp_id;

-- 6. Re-create the view
CREATE OR REPLACE VIEW public.vw_custo_pivo AS
SELECT 
    id as pivo_id,
    nome as pivo_nome,
    area as area_ha,
    headcount,
    custo_total_calculado,
    position,
    trabalhadores_min,
    trabalhadores_ideal,
    trabalhadores_max,
    custos_adicionais
FROM public.pivos;
