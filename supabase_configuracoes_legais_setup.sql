CREATE TABLE IF NOT EXISTS public.configuracoes_legais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salario_minimo NUMERIC NOT NULL DEFAULT 1621.00,
  inss_empresa_percentual NUMERIC NOT NULL DEFAULT 20.0,
  fgts_percentual NUMERIC NOT NULL DEFAULT 8.0,
  rat_percentual NUMERIC NOT NULL DEFAULT 2.0,
  terceiros_percentual NUMERIC NOT NULL DEFAULT 5.8,
  provisao_ferias_percentual NUMERIC NOT NULL DEFAULT 11.11,
  provisao_13_percentual NUMERIC NOT NULL DEFAULT 8.33,
  adicionais_percentual NUMERIC NOT NULL DEFAULT 0.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.configuracoes_legais (salario_minimo, inss_empresa_percentual, fgts_percentual, rat_percentual, terceiros_percentual, provisao_ferias_percentual, provisao_13_percentual, adicionais_percentual)
SELECT 1621.00, 20.0, 8.0, 2.0, 5.8, 11.11, 8.33, 0.0
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_legais);
