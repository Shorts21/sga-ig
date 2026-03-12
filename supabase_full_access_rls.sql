-- Garante permissão SELECT completa para o usuário autenticado em todas as tabelas principais
-- Sem filtros automáticos por user_id, empresa ou status, conforme solicitado.

-- 1. Pivos
ALTER TABLE public.pivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total pivos" ON public.pivos;
CREATE POLICY "Permitir leitura total pivos" ON public.pivos FOR SELECT TO authenticated USING (true);

-- 2. Pivos Geo
ALTER TABLE public.pivos_geo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total pivos_geo" ON public.pivos_geo;
CREATE POLICY "Permitir leitura total pivos_geo" ON public.pivos_geo FOR SELECT TO authenticated USING (true);

-- 3. Poligonais
ALTER TABLE public.poligonais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total poligonais" ON public.poligonais;
CREATE POLICY "Permitir leitura total poligonais" ON public.poligonais FOR SELECT TO authenticated USING (true);

-- 4. Colaboradores
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total colaboradores" ON public.colaboradores;
CREATE POLICY "Permitir leitura total colaboradores" ON public.colaboradores FOR SELECT TO authenticated USING (true);

-- 5. Culturas
ALTER TABLE public.culturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total culturas" ON public.culturas;
CREATE POLICY "Permitir leitura total culturas" ON public.culturas FOR SELECT TO authenticated USING (true);

-- 6. Configuracoes Legais
ALTER TABLE public.configuracoes_legais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura total configuracoes_legais" ON public.configuracoes_legais;
CREATE POLICY "Permitir leitura total configuracoes_legais" ON public.configuracoes_legais FOR SELECT TO authenticated USING (true);
