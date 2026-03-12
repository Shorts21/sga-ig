-- Cria tabela de Histórico Financeiro Mensal do Pivô
CREATE TABLE IF NOT EXISTS public.pivos_historico_financeiro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pivo_id UUID REFERENCES public.pivos(id) ON DELETE CASCADE,
    mes_referencia DATE NOT NULL, -- ex: '2023-08-01' para Agosto/2023
    custo_total NUMERIC NOT NULL,
    custo_por_hectare NUMERIC NOT NULL,
    headcount INTEGER NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria tabela de Histórico de Safras/Culturas 
CREATE TABLE IF NOT EXISTS public.pivos_historico_safras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pivo_id UUID REFERENCES public.pivos(id) ON DELETE CASCADE,
    cultura_nome TEXT NOT NULL,
    data_plantio DATE NOT NULL,
    data_colheita_prevista DATE,
    data_colheita_realizada DATE,
    mao_de_obra_estimada INTEGER,
    status TEXT DEFAULT 'PLANEJADO', -- PLANEJADO, ATIVO, CONCLUIDO
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cria tabela de Status e Manutenções Técnicas
CREATE TABLE IF NOT EXISTS public.pivos_manutencoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pivo_id UUID REFERENCES public.pivos(id) ON DELETE CASCADE,
    data_manutencao DATE NOT NULL,
    tipo_manutencao TEXT NOT NULL, -- PREVENTIVA, CORRETIVA
    descricao TEXT NOT NULL,
    tecnico_responsavel TEXT,
    custo_manutencao NUMERIC DEFAULT 0,
    proxima_manutencao_prevista DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.pivos_historico_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pivos_historico_safras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pivos_manutencoes ENABLE ROW LEVEL SECURITY;

-- Criar politicas que permitem tudo (anon/authenticated) para simplicidade inicial:
CREATE POLICY "Permitir leitura historico financeiro" ON public.pivos_historico_financeiro FOR SELECT USING (true);
CREATE POLICY "Permitir insercao historico financeiro" ON public.pivos_historico_financeiro FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update historico financeiro" ON public.pivos_historico_financeiro FOR UPDATE USING (true);
CREATE POLICY "Permitir delete historico financeiro" ON public.pivos_historico_financeiro FOR DELETE USING (true);

CREATE POLICY "Permitir leitura safras" ON public.pivos_historico_safras FOR SELECT USING (true);
CREATE POLICY "Permitir insercao safras" ON public.pivos_historico_safras FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update safras" ON public.pivos_historico_safras FOR UPDATE USING (true);
CREATE POLICY "Permitir delete safras" ON public.pivos_historico_safras FOR DELETE USING (true);

CREATE POLICY "Permitir leitura manutencao" ON public.pivos_manutencoes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao manutencao" ON public.pivos_manutencoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update manutencao" ON public.pivos_manutencoes FOR UPDATE USING (true);
CREATE POLICY "Permitir delete manutencao" ON public.pivos_manutencoes FOR DELETE USING (true);
