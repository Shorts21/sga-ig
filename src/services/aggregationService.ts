import { supabase } from './supabase';

const SALARIO_SIMULADO = 1800;
const ENCARGOS_PERCENTUAL_PADRAO = 0.28;

export interface AggregatedPivotData {
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
}

export const aggregateData = async (): Promise<AggregatedPivotData[]> => {
  // Fetch legal settings for accurate real cost
  let legalConfig = { inss_empresa_percentual: 20, fgts_percentual: 8, rat_percentual: 2, terceiros_percentual: 5.8, provisao_ferias_percentual: 11.11, provisao_13_percentual: 8.33 };
  try {
    const res = await fetch('/api/configuracoes-legais');
    if (res.ok) legalConfig = await res.json();
  } catch (e) {
    console.warn('Could not fetch legal config, using defaults');
  }

  const ENCARGOS_TOTAL = (legalConfig.inss_empresa_percentual + legalConfig.fgts_percentual + legalConfig.rat_percentual + legalConfig.terceiros_percentual + legalConfig.provisao_ferias_percentual + legalConfig.provisao_13_percentual) / 100;

  // 1. Fetch pivots to get area information
  const { data: pivots, error: pivotsError } = await supabase
    .from('pivos')
    .select('nome, area_hectares');
  
  if (pivotsError) {
    console.error('Error fetching pivots:', pivotsError);
    return [];
  }
  const pivotAreaMap = new Map<string, number>();
  pivots.forEach(p => {
    pivotAreaMap.set(p.nome, p.area_hectares);
  });

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
    // Use fallback for salary calculation
    const salario = c.salario_base ?? c.salario ?? legalConfig.salario_minimo ?? 1412;
    const custo_real_colab = c.custo_empresa_calculado || (salario * (1 + ENCARGOS_TOTAL));

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
  const result: AggregatedPivotData[] = [];

  for (const [pivo_nome, data] of aggregated.entries()) {
    const media_salario = data.soma_salarios / data.total_colaboradores;
    const headcount_ideal = data.total_colaboradores;
    const headcount_min = Math.floor(headcount_ideal * 0.8);
    const headcount_max = Math.ceil(headcount_ideal * 1.2);
    const custo_total = data.soma_salarios;
    const custo_real = data.soma_custo_real;

    result.push({
      pivo_nome,
      area_ha: pivotAreaMap.get(pivo_nome) || 0, // Get area from map
      total_colaboradores: data.total_colaboradores,
      soma_salarios: data.soma_salarios,
      media_salario,
      headcount_min,
      headcount_ideal,
      headcount_max,
      custo_total,
      custo_real,
    });
  }

  return result;
};
