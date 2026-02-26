-- Fix missing columns in 'pivos' table
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_min INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_ideal INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS trabalhadores_max INTEGER;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS custos_adicionais NUMERIC;

-- Re-create the view now that columns exist
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
