-- Migração KML Importacao
DO $$
BEGIN
  -- Habilita PostGIS se não existir
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'Erro ao tentar habilitar PostGIS, pode já estar habilitado ou não há permissão: %', SQLERRM;
END $$;

-- 1. Cria a coluna de Hash único na tabela pivos_geo
ALTER TABLE public.pivos_geo
ADD COLUMN IF NOT EXISTS import_hash TEXT UNIQUE;

-- 2. Cria a coluna espacial geom se não existir (SRID 4326)
ALTER TABLE public.pivos_geo
ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

-- 3. Função para popular a geometria espacial baseada nos dados JSON, tratar SRID e ST_IsValid
CREATE OR REPLACE FUNCTION public.sync_pivos_geo_geom()
RETURNS TRIGGER AS $$
DECLARE
    json_geom jsonb;
    txt_geom text;
    has_geom boolean := false;
BEGIN
    -- Se json nulo e geom não nulo, não faz nada
    IF NEW.geometry IS NULL AND NEW.tipo != 'circle' THEN
        RETURN NEW;
    END IF;

    -- Constrói o texto WKT dependendo do tipo
    IF NEW.tipo = 'point' THEN
        IF NEW.centro IS NOT NULL THEN
            IF jsonb_array_length(NEW.centro) = 2 THEN
                -- centro tem formato [lat, lng], KML vem como lng=x lat=y. ST_Point(longitude, latitude)
                txt_geom := 'POINT(' || (NEW.centro->>1) || ' ' || (NEW.centro->>0) || ')';
                has_geom := true;
            END IF;
        END IF;
    ELSIF NEW.tipo = 'polygon' THEN
        IF NEW.geometry IS NOT NULL AND jsonb_array_length(NEW.geometry) > 2 THEN
            -- Constroi WKT POLYGON((lng lat, ...))
            SELECT string_agg((p->>1) || ' ' || (p->>0), ', ') 
            INTO txt_geom
            FROM jsonb_array_elements(NEW.geometry) as p;
            
            -- Para polígonos, o primeiro e último ponto devem ser iguais
            IF (NEW.geometry->0) != (NEW.geometry->(jsonb_array_length(NEW.geometry)-1)) THEN
               txt_geom := txt_geom || ', ' || (NEW.geometry->0->>1) || ' ' || (NEW.geometry->0->>0);
            END IF;

            txt_geom := 'POLYGON((' || txt_geom || '))';
            has_geom := true;
        END IF;
    END IF;

    IF has_geom THEN
        BEGIN
            -- Realiza a conversão
            NEW.geom := ST_SetSRID(ST_GeomFromText(txt_geom), 4326);
            
            -- Se for inválido, tentar corrigir com ST_MakeValid
            IF NOT ST_IsValid(NEW.geom) THEN
                NEW.geom := ST_MakeValid(NEW.geom);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao processar geometria PostGIS do pivo_geo id %: %', NEW.id, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Cria o Trigger
DROP TRIGGER IF EXISTS trg_sync_pivos_geo_geom ON public.pivos_geo;
CREATE TRIGGER trg_sync_pivos_geo_geom
BEFORE INSERT OR UPDATE ON public.pivos_geo
FOR EACH ROW
EXECUTE FUNCTION public.sync_pivos_geo_geom();
