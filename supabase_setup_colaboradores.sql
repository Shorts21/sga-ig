-- 1. Create 'colaboradores' table
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cargo TEXT,
    salario NUMERIC,
    pivo_id UUID REFERENCES public.pivos(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create RPC function to update pivot summaries
CREATE OR REPLACE FUNCTION public.update_pivot_summaries()
RETURNS TABLE(pivo_id_updated UUID, new_headcount BIGINT, new_cost NUMERIC)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH summary AS (
        SELECT
            p.id as pivo_id,
            COUNT(c.id) as calculated_headcount,
            SUM(c.salario) as calculated_cost
        FROM
            public.pivos p
        LEFT JOIN
            public.colaboradores c ON p.id = c.pivo_id
        GROUP BY
            p.id
    )
    UPDATE
        public.pivos p
    SET
        headcount = s.calculated_headcount,
        custo_total_calculado = s.calculated_cost
    FROM
        summary s
    WHERE
        p.id = s.pivo_id
    RETURNING
        p.id, p.headcount, p.custo_total_calculado;
END;
$$;
