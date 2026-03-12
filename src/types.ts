export interface ConfiguracoesLegais {
  id: string;
  salario_minimo: number;
  inss_empresa_percentual: number;
  fgts_percentual: number;
  rat_percentual: number;
  terceiros_percentual: number;
  provisao_ferias_percentual: number;
  provisao_13_percentual: number;
  adicionais_percentual: number;
}

export interface TipoAtividade {
  id: string;
  nome: string;
  salario_base: number;
  carga_horaria: number;
  insalubridade_percentual: number;
  periculosidade_percentual: number;
  hora_extra_percentual: number;
  adicional_noturno_percentual: number;
}

export interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  pivo_id: string;
  pivo_nome?: string;
  // New fields
  salario_base: number;
  bonus_fixo: number;
  horas_extras_mensais: number;
  tipo_atividade_id: string;
  custo_empresa_calculado: number;
  data_admissao?: string;
}

export interface Cultura {
  id: string;
  nome: string;
  fator_ha_por_pessoa: number;
  descricao: string;
  ativo: boolean;
}

export interface Pivot {
  pivo_id: string; // UUID
  pivo_nome: string;
  position: { type: 'Point'; coordinates: [number, number] } | null;
  area_ha: number;
  headcount: number;
  custo_total_calculado: number;
  custo_por_hectare?: number;
  trabalhadores_min?: number;
  trabalhadores_ideal?: number;
  trabalhadores_max?: number;
  trabalhadores_atual?: number;
  custos_adicionais?: number;
  cultura_id?: string;
  fase_atual?: string;
  data_inicio_ciclo?: string;
  data_fim_prevista?: string;
}

export interface Poligonal {
  nome: string;
  geometry: { type: string, coordinates: [number, number][][] };
  area_hectares?: number;
}

export interface Colaborador {
  id: string;
  nome: string;
  cargo: string;
  salario: number;
  pivo_id: string;
  pivo_nome?: string;
}
export interface PivotGeo {
  id?: string;
  nome: string;
  area_ha: number;
  tipo: 'polygon' | 'circle';
  geometry?: [number, number][]; // [lat, lng] para polígonos
  centro?: [number, number];     // [lat, lng] para círculos
  raio_m?: number;              // raio em metros
}
