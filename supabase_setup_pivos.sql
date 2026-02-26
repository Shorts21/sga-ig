-- 1. Table: pivos (Ensure it exists and has columns)
CREATE TABLE IF NOT EXISTS public.pivos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT UNIQUE,
    area NUMERIC,
    headcount INTEGER,
    custo_total_calculado NUMERIC,
    trabalhadores_min INTEGER,
    trabalhadores_ideal INTEGER,
    trabalhadores_max INTEGER,
    custos_adicionais NUMERIC,
    position JSONB -- { type: 'Point', coordinates: [lng, lat] }
);

-- Add columns if missing
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS custo_total_calculado NUMERIC;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS position JSONB;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS area NUMERIC;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS headcount INTEGER;

-- 2. View: vw_custo_pivo
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

-- 3. Table: poligonais
CREATE TABLE IF NOT EXISTS public.poligonais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT,
    area_ha NUMERIC,
    coordinates JSONB -- Array of arrays [[lng, lat], ...]
);

-- Enable RLS
ALTER TABLE public.pivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poligonais ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all for anon" ON public.pivos;
CREATE POLICY "Enable all for anon" ON public.pivos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.poligonais;
CREATE POLICY "Enable all for anon" ON public.poligonais FOR ALL TO anon USING (true) WITH CHECK (true);
