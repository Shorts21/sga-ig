-- Execute this SQL in your Supabase SQL Editor to create the necessary tables and columns

-- 1. Table: importacoes_headcount
CREATE TABLE IF NOT EXISTS public.importacoes_headcount (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nome_arquivo TEXT,
    total_linhas INTEGER,
    linhas_com_erro INTEGER
);

-- Add columns safely (Postgres 9.6+)
ALTER TABLE public.importacoes_headcount ADD COLUMN IF NOT EXISTS nome_arquivo TEXT;
ALTER TABLE public.importacoes_headcount ADD COLUMN IF NOT EXISTS total_linhas INTEGER;
ALTER TABLE public.importacoes_headcount ADD COLUMN IF NOT EXISTS linhas_com_erro INTEGER;

-- Enable RLS
ALTER TABLE public.importacoes_headcount ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.importacoes_headcount;
CREATE POLICY "Enable insert for authenticated users only" ON public.importacoes_headcount FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.importacoes_headcount;
CREATE POLICY "Enable select for authenticated users only" ON public.importacoes_headcount FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.importacoes_headcount;
CREATE POLICY "Enable update for authenticated users only" ON public.importacoes_headcount FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.importacoes_headcount;
CREATE POLICY "Enable all for anon" ON public.importacoes_headcount FOR ALL TO anon USING (true) WITH CHECK (true);


-- 2. Table: colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    importacao_id UUID REFERENCES public.importacoes_headcount(id),
    nome TEXT,
    cargo TEXT,
    salario NUMERIC,
    pivo_nome TEXT
);

-- Add columns safely
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS pivo_nome TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS importacao_id UUID REFERENCES public.importacoes_headcount(id);
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario NUMERIC;

-- Enable RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.colaboradores;
CREATE POLICY "Enable insert for authenticated users only" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.colaboradores;
CREATE POLICY "Enable select for authenticated users only" ON public.colaboradores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.colaboradores;
CREATE POLICY "Enable all for anon" ON public.colaboradores FOR ALL TO anon USING (true) WITH CHECK (true);


-- 3. Table: headcount_pivo
CREATE TABLE IF NOT EXISTS public.headcount_pivo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    importacao_id UUID REFERENCES public.importacoes_headcount(id),
    pivo_id UUID, -- References pivos(id)
    mes_ano TEXT,
    headcount INTEGER
);

-- Enable RLS
ALTER TABLE public.headcount_pivo ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.headcount_pivo;
CREATE POLICY "Enable insert for authenticated users only" ON public.headcount_pivo FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable select for authenticated users only" ON public.headcount_pivo;
CREATE POLICY "Enable select for authenticated users only" ON public.headcount_pivo FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.headcount_pivo;
CREATE POLICY "Enable all for anon" ON public.headcount_pivo FOR ALL TO anon USING (true) WITH CHECK (true);
