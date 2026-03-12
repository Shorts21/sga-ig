import { supabase } from './supabase';

const SALARIO_SIMULADO = 1800;
const ENCARGOS_PERCENTUAL_PADRAO = 0.28;

export interface AggregatedPivotData {
  pivo_id?: string;
  pivo_nome: string;
  area_ha: number;
  total_colaboradores: number;
  soma_salarios: number;
  media_salario: number;
  headcount_min: number;
  headcount_ideal: number;
  headcount_max: number;
  custo_total: number;
  custo_real: number;
  is_cadastrado?: boolean;
  cultura_nome?: string;
}

export const aggregateData = async (): Promise<AggregatedPivotData[]> => {
  // Fetch legal settings for accurate real cost
  let legalConfig = { salario_minimo: 1621, inss_empresa_percentual: 20, fgts_percentual: 8, rat_percentual: 2, terceiros_percentual: 5.8, provisao_ferias_percentual: 11.11, provisao_13_percentual: 8.33 };
  try {
    const res = await fetch('/api/configuracoes-legais');
    if (res.ok) {
      const text = await res.text();
      try {
        legalConfig = JSON.parse(text);
      } catch (parseError) {
        console.warn('API returned non-JSON content. Redirected to index.html?');
      }
    }
  } catch (e) {
    console.warn('Could not fetch legal config, using defaults');
  }

  const ENCARGOS_TOTAL = (legalConfig.inss_empresa_percentual + legalConfig.fgts_percentual + legalConfig.rat_percentual + legalConfig.terceiros_percentual + legalConfig.provisao_ferias_percentual + legalConfig.provisao_13_percentual) / 100;

  // 1. Fetch pivots to get area and culture information
  const { data: pivots, error: pivotsError } = await supabase
    .from('pivos')
    .select('nome, area_hectares, culturas(nome)')
    .range(0, 5000);

  if (pivotsError) {
    console.error('Error fetching pivots:', pivotsError);
    return [];
  }
  const pivotAreaMap = new Map<string, number>();
  const pivotCultureMap = new Map<string, string>();
  const pivotIdMap = new Map<string, string>();

  pivots.forEach((p: any) => {
    pivotAreaMap.set(p.nome, p.area_hectares);
    if (p.culturas?.nome) pivotCultureMap.set(p.nome, p.culturas.nome);
    if (p.id) pivotIdMap.set(p.nome, String(p.id));
  });

  const { data: geoPivots, error: geoError } = await supabase
    .from('pivos_geo')
    .select('id, nome, area_ha')
    .range(0, 5000);

  if (!geoError && geoPivots) {
    geoPivots.forEach(p => {
      if (p.nome) {
        pivotAreaMap.set(p.nome, p.area_ha);
        if (p.id) pivotIdMap.set(p.nome, String(p.id));
      }
    });
  }

  // 2. Fetch collaborators with pivot names
  const { data: colaboradores, error: colabError } = await supabase
    .from('colaboradores')
    .select('*');

  if (colabError) {
    console.error('Error fetching collaborators:', colabError);
    return [];
  }

  // 3. Aggregate collaborator data
  const aggregated = new Map<string, any>();

  colaboradores.forEach((c: any) => {
    const pivo_nome = c.pivo_nome || 'operacional_geral';
    // Use exclusively salario_base or fallback to 1621 for calculation, ignoring corrupted 'salario'
    const salarioBaseConf = legalConfig.salario_minimo || 1621;
    const salario = Number(c.salario_base) || salarioBaseConf;
    const custo_real_colab = salario * (1 + ENCARGOS_TOTAL);

    if (!aggregated.has(pivo_nome)) {
      aggregated.set(pivo_nome, {
        total_colaboradores: 0,
        soma_salarios: 0,
        soma_custo_real: 0,
      });
    }

    const current = aggregated.get(pivo_nome);
    current.total_colaboradores++;
    current.soma_salarios += salario;
    current.soma_custo_real += custo_real_colab;
  });

  // 4. Combine aggregated data with pivot area data
  const result: (AggregatedPivotData & { is_cadastrado?: boolean })[] = [];

  // Get ALL pivot names from the map (which includes all from 'pivos' and 'pivos_geo')
  const allPivotNames = Array.from(pivotAreaMap.keys());

  allPivotNames.forEach(pivo_nome => {
    const data = aggregated.get(pivo_nome) || { total_colaboradores: 0, soma_salarios: 0, soma_custo_real: 0 };
    const total_colaboradores = data.total_colaboradores;
    const media_salario = total_colaboradores > 0 ? data.soma_salarios / total_colaboradores : legalConfig.salario_minimo || 1621;

    // Check if it exists in the 'pivos' table (registered)
    const is_cadastrado = pivots.some(p => p.nome === pivo_nome);

    result.push({
      pivo_id: pivotIdMap.get(pivo_nome),
      pivo_nome,
      area_ha: pivotAreaMap.get(pivo_nome) || 0,
      total_colaboradores,
      soma_salarios: data.soma_salarios,
      media_salario,
      headcount_min: Math.floor(total_colaboradores * 0.8),
      headcount_ideal: total_colaboradores,
      headcount_max: Math.ceil(total_colaboradores * 1.2),
      custo_total: data.soma_salarios,
      custo_real: data.soma_custo_real,
      is_cadastrado,
      cultura_nome: pivotCultureMap.get(pivo_nome)
    });
  });


  return result;
};
