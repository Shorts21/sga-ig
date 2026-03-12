-- Create the 'pivos_geo' table for geographic data
CREATE TABLE IF NOT EXISTS public.pivos_geo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    area_ha NUMERIC,
    geometry JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pivos_geo ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all access for anyone" ON public.pivos_geo;
CREATE POLICY "Enable all access for anyone" ON public.pivos_geo FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for authenticated" ON public.pivos_geo;
CREATE POLICY "Enable all access for authenticated" ON public.pivos_geo FOR ALL TO authenticated USING (true) WITH CHECK (true);
