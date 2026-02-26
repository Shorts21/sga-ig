import { Colaborador, ConfiguracoesLegais } from '../types';

/**
 * Retorna o salário efetivo do colaborador, aplicando o fallback do salário mínimo
 * se o salário base não estiver definido.
 */
export function getSalarioEfetivo(colaborador: Partial<Colaborador>, configGlobal: Partial<ConfiguracoesLegais>): number {
  const salarioBase = colaborador.salario_base ?? colaborador.salario ?? configGlobal.salario_minimo ?? 1412;
  return salarioBase;
}

/**
 * Calcula o custo total da empresa para um colaborador, incluindo encargos, provisões e adicionais.
 */
export function calcularCustoEmpresa(colaborador: Partial<Colaborador>, config: ConfiguracoesLegais): number {
  const salarioEfetivo = getSalarioEfetivo(colaborador, config);
  
  const encargosPercent = (
    config.inss_empresa_percentual + 
    config.fgts_percentual + 
    config.rat_percentual + 
    config.terceiros_percentual
  ) / 100;
  
  const provisoesPercent = (
    config.provisao_ferias_percentual + 
    config.provisao_13_percentual
  ) / 100;
  
  const adicionaisPercent = (config.adicionais_percentual || 0) / 100;
  
  // Custo = (Salário + Bônus) * (1 + Encargos + Provisões) * (1 + Adicionais)
  const base = salarioEfetivo + (colaborador.bonus_fixo || 0);
  const total = base * (1 + encargosPercent + provisoesPercent) * (1 + adicionaisPercent);
  
  return total;
}
