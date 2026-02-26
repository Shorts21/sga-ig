-- Ensure 'id' column exists as primary key
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Ensure other columns exist
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS area NUMERIC;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS headcount INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS custo_total_calculado NUMERIC;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_min INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_ideal INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_max INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS custos_adicionais NUMERIC;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS position JSONB;

-- Re-create the view
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
