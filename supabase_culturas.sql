-- 1. Criar tabela culturas
CREATE TABLE IF NOT EXISTS public.culturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    fator_ha_por_pessoa NUMERIC NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais de culturas
INSERT INTO public.culturas (nome, fator_ha_por_pessoa, descricao)
VALUES 
    ('Batata', 60, '1 colaborador a cada 60 ha'),
    ('Tomate', 40, '1 colaborador a cada 40 ha'),
    ('Cebola', 70, '1 colaborador a cada 70 ha'),
    ('Alho', 55, '1 colaborador a cada 55 ha')
ON CONFLICT DO NOTHING;

-- 2. Vincular cultura aos pivos e pivos_geo
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS cultura_id UUID REFERENCES public.culturas(id);
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS fase_atual TEXT;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS data_inicio_ciclo DATE;
ALTER TABLE public.pivos ADD COLUMN IF NOT EXISTS data_fim_prevista DATE;

ALTER TABLE public.pivos_geo ADD COLUMN IF NOT EXISTS cultura_id UUID REFERENCES public.culturas(id);
ALTER TABLE public.pivos_geo ADD COLUMN IF NOT EXISTS fase_atual TEXT;
ALTER TABLE public.pivos_geo ADD COLUMN IF NOT EXISTS data_inicio_ciclo DATE;
ALTER TABLE public.pivos_geo ADD COLUMN IF NOT EXISTS data_fim_prevista DATE;

-- Habilitar RLS
ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;

-- Criar politicas que permitem tudo (anon/authenticated) para praticidade imediata
CREATE POLICY "Permitir leitura culturas" ON public.culturas FOR SELECT USING (true);
CREATE POLICY "Permitir insercao culturas" ON public.culturas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update culturas" ON public.culturas FOR UPDATE USING (true);
CREATE POLICY "Permitir delete culturas" ON public.culturas FOR DELETE USING (true);
