import React, { useState, useEffect, useMemo } from 'react';
import { AggregatedPivotData, aggregateData } from '../services/aggregationService';
import { Users, Target, AlertCircle, TrendingUp, Settings2, Info, DollarSign, Search, ArrowUpDown, Briefcase } from 'lucide-react';
import { ConfiguracoesLegais, TipoAtividade, Colaborador } from '../types';
import { getSalarioEfetivo, calcularCustoEmpresa } from '../utils/financialUtils';

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
      <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-pre-wrap w-48 shadow-xl border border-slate-700">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  </div>
);

const StrategicSimulationPage: React.FC = () => {
  const [aggregatedData, setAggregatedData] = useState<AggregatedPivotData[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // HR Config State
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);
  const [activityTypes, setActivityTypes] = useState<TipoAtividade[]>([]);

  // Layer 2: Editable Parameters
  const [fatorMaoObra, setFatorMaoObra] = useState(1.0);
  const [eficiencia, setEficiencia] = useState(100);
  const [novosPivos, setNovosPivos] = useState(0);
  const [adicionaisPercent, setAdicionaisPercent] = useState(0);

  // Collaborator List State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Colaborador | 'custo'; direction: 'asc' | 'desc' }>({ key: 'nome', direction: 'asc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, legalRes, activityRes, colabRes] = await Promise.all([
          aggregateData(),
          fetch('/api/configuracoes-legais'),
          fetch('/api/tipos-atividade'),
          fetch('/api/colaboradores')
        ]);
        
        setAggregatedData(data);
        if (legalRes.ok) setLegalSettings(await legalRes.json());
        if (activityRes.ok) setActivityTypes(await activityRes.json());
        if (colabRes.ok) setColaboradores(await colabRes.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const config = legalSettings || {
    id: '',
    salario_minimo: 1412,
    inss_empresa_percentual: 20,
    fgts_percentual: 8,
    rat_percentual: 2,
    terceiros_percentual: 5.8,
    provisao_ferias_percentual: 11.11,
    provisao_13_percentual: 8.33,
    adicionais_percentual: 0
  };

  // Sync global adicionais with local state on load
  useEffect(() => {
    if (legalSettings?.adicionais_percentual !== undefined) {
      setAdicionaisPercent(legalSettings.adicionais_percentual);
    }
  }, [legalSettings]);

  // Layer 3: Simulation Engine
  const getComplexityFactor = (area: number) => {
    if (area < 40) return 0.7;
    if (area > 80) return 1.3;
    return 1.0;
  };

  const simulationResults = useMemo(() => {
    return aggregatedData.map(p => {
      const complexity = getComplexityFactor(p.area_ha);
      // Necessidade = (Ideal * Complexidade * Fator) / Eficiência
      // Adicionais (%) can also affect necessity if we assume it adds workload or complexity
      const necessidade = Math.round((p.headcount_ideal * complexity * fatorMaoObra * (1 + adicionaisPercent / 100)) / (eficiencia / 100));
      const atual = p.total_colaboradores;
      const delta = atual - necessidade;
      
      // Financial calculations
      const mediaSalario = p.media_salario || config.salario_minimo;
      
      // Recalculate cost with dynamic adicionais
      const encargosPercent = (config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual) / 100;
      const provisoesPercent = (config.provisao_ferias_percentual + config.provisao_13_percentual) / 100;
      
      // We use the base cost from aggregation and apply the new adicionais
      // Since aggregation already includes global adicionais, we need to strip it and apply the local one
      const globalAdicionaisPercent = (config.adicionais_percentual || 0) / 100;
      const baseCostWithoutAdicionais = p.custo_real / (1 + globalAdicionaisPercent);
      
      const custoTotal = baseCostWithoutAdicionais * (1 + adicionaisPercent / 100);
      const custoHectare = p.area_ha > 0 ? custoTotal / p.area_ha : 0;

      return {
        ...p,
        complexity,
        necessidade,
        atual,
        delta,
        mediaSalario,
        custoTotal,
        custoHectare
      };
    });
  }, [aggregatedData, fatorMaoObra, eficiencia, adicionaisPercent, config]);

  // Cost Calculation Logic
  const operatorType = activityTypes.find(t => t.nome.toLowerCase().includes('operador')) || activityTypes[0];
  
  const calculateFullCost = (baseSalary: number) => {
    const encargosPercent = (config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual) / 100;
    const provisoesPercent = (config.provisao_ferias_percentual + config.provisao_13_percentual) / 100;
    
    return baseSalary * (1 + encargosPercent + provisoesPercent) * (1 + adicionaisPercent / 100);
  };

  const costPerOperator = operatorType ? calculateFullCost(operatorType.salario_base) : calculateFullCost(config.salario_minimo);

  // Handle simulated new pivots (average of existing)
  const avgIdeal = aggregatedData.length > 0 
    ? aggregatedData.reduce((sum, p) => sum + p.headcount_ideal, 0) / aggregatedData.length 
    : 0;
  const extraNecessidade = Math.round(novosPivos * avgIdeal * fatorMaoObra * (1 + adicionaisPercent / 100) / (eficiencia / 100));

  const totalAtual = simulationResults.reduce((sum, p) => sum + p.atual, 0);
  const totalNecessario = simulationResults.reduce((sum, p) => sum + p.necessidade, 0) + extraNecessidade;
  const totalDelta = totalAtual - totalNecessario;
  
  const impactFinancial = Math.abs(totalDelta) * costPerOperator;

  // Collaborator Filtering and Sorting
  const filteredColaboradores = useMemo(() => {
    let result = colaboradores.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof Colaborador] || 0;
      let valB: any = b[sortConfig.key as keyof Colaborador] || 0;
      
      if (sortConfig.key === 'custo') {
        valA = a.custo_empresa_calculado || calcularCustoEmpresa(a, config);
        valB = b.custo_empresa_calculado || calcularCustoEmpresa(b, config);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [colaboradores, searchTerm, sortConfig, config]);

  const toggleSort = (key: keyof Colaborador | 'custo') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium">Processando modelo matemático...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-rose-600 font-medium">Erro: {error}</div>;

  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Simulação Estratégica</h1>
          <p className="text-sm text-slate-500">Modelo de dimensionamento baseado em carga operacional e custo real</p>
        </div>
      </div>
      
      {/* Layer 2: Parameters Panel */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 text-slate-900 font-medium">
          <Settings2 className="w-4 h-4 text-slate-400" />
          Parâmetros do Modelo
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fator Mão de Obra</label>
              <span className="text-sm font-mono font-bold text-slate-900">{fatorMaoObra.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={fatorMaoObra}
              onChange={(e) => setFatorMaoObra(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
            <p className="text-[10px] text-slate-400">Multiplicador global de necessidade por pivô.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eficiência Operacional</label>
              <span className="text-sm font-mono font-bold text-slate-900">{eficiencia}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              step="5"
              value={eficiencia}
              onChange={(e) => setEficiencia(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
            <p className="text-[10px] text-slate-400">Capacidade de entrega da equipe atual.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adicionais (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="300"
                value={adicionaisPercent}
                onChange={(e) => setAdicionaisPercent(Number(e.target.value))}
                className="h-9 w-24 border border-gray-200 rounded-md px-2 text-sm font-mono focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">Percentual extra de encargos ou horas extras.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expansão (Novos Pivôs)</label>
              <span className="text-sm font-mono font-bold text-slate-900">+{novosPivos}</span>
            </div>
            <input
              type="number"
              min="0"
              max="50"
              value={novosPivos}
              onChange={(e) => setNovosPivos(Number(e.target.value))}
              className="w-full h-9 rounded-lg border-gray-200 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm font-mono px-3"
            />
            <p className="text-[10px] text-slate-400">Simular impacto de novos plantios.</p>
          </div>
        </div>
      </div>

      {/* Layer 4: Strategic Visualization (Delta Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Quadro Atual</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-semibold text-slate-900">{totalAtual}</div>
          <p className="text-xs text-slate-400 mt-1">Colaboradores ativos</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Necessidade</span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-semibold text-slate-900">{totalNecessario}</div>
          <p className="text-xs text-slate-400 mt-1">Projeção do modelo</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-4 transition-colors backdrop-blur-sm ${
          totalDelta < 0 ? 'bg-rose-50/90 border-rose-100' : 'bg-emerald-50/90 border-emerald-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${totalDelta < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {totalDelta < 0 ? 'Déficit' : 'Excesso'}
            </span>
            <AlertCircle className={`w-4 h-4 ${totalDelta < 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-2xl font-bold ${totalDelta < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {Math.abs(totalDelta)}
          </div>
          <p className={`text-xs mt-1 ${totalDelta < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {totalDelta < 0 ? 'Contratação sugerida' : 'Otimização possível'}
          </p>
        </div>

        <div className="bg-slate-900 rounded-xl shadow-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Impacto Financeiro</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold">R$ {Math.round(impactFinancial).toLocaleString('pt-BR')}</div>
          <p className="text-xs text-slate-400 mt-1">
            {totalDelta < 0 ? 'Custo mensal extra' : 'Economia potencial'}
          </p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-900">Detalhamento por Ativo</h3>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <Info className="w-3 h-3" />
            Ponderado por complexidade (Área)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Identificação do ativo operacional vinculado à área.">
                    <div className="flex items-center gap-1">Pivô <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Área irrigada vinculada ao pivô ou poligonal usada para cálculo operacional.">
                    <div className="flex items-center gap-1">Área (ha) <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Fator operacional aplicado ao ativo para estimar necessidade de mão de obra.">
                    <div className="flex items-center gap-1">Peso <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Quantidade atual de colaboradores vinculados à área.">
                    <div className="flex items-center gap-1">Atual <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Quantidade estimada automaticamente baseada nos pivôs e parâmetros.">
                    <div className="flex items-center gap-1">Necessário <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Diferença entre quadro atual e necessidade calculada.\nValor negativo indica déficit de mão de obra.">
                    <div className="flex items-center gap-1">Delta <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Média salarial base dos colaboradores vinculados.">
                    <div className="flex items-center gap-1">Salário Médio <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Custo mensal estimado incluindo salário base, adicionais e encargos legais.">
                    <div className="flex items-center gap-1">Custo Total <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <Tooltip text="Indicador financeiro calculado dividindo o custo total pela área irrigada.">
                    <div className="flex items-center gap-1">Custo/ha <Info className="w-3 h-3" /></div>
                  </Tooltip>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {simulationResults.map((p) => (
                <tr key={p.pivo_nome} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.pivo_nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{p.area_ha.toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{p.complexity.toFixed(1)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono font-bold">{p.atual}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono font-bold">{p.necessidade}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono ${
                    p.delta < 0 ? 'text-rose-600' : p.delta > 0 ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {p.delta > 0 ? `+${p.delta}` : p.delta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">{currencyFormatter.format(p.mediaSalario)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono font-bold">{currencyFormatter.format(p.custoTotal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{currencyFormatter.format(p.custoHectare)}/ha</td>
                </tr>
              ))}
              {novosPivos > 0 && (
                <tr className="bg-blue-50/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700 italic">Simulação: Novos Pivôs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">1.0</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">0</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono font-bold">{extraNecessidade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-rose-600 font-mono">-{extraNecessidade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 font-mono font-bold">{currencyFormatter.format(extraNecessidade * costPerOperator)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500 font-mono">-</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhamento de Colaboradores Expanded */}
      <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full">
        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900">Detalhamento de Colaboradores</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none w-full md:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600" onClick={() => toggleSort('nome')}>
                  <div className="flex items-center gap-1">Nome <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Atividade
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Salário Efetivo
                </th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600" onClick={() => toggleSort('custo')}>
                  <div className="flex items-center gap-1">Custo Empresa <ArrowUpDown className="w-3 h-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredColaboradores.map((c) => {
                const activity = activityTypes.find(t => t.id === c.tipo_atividade_id);
                const salarioEfetivo = getSalarioEfetivo(c, config);
                // In simulation, we apply the dynamic adicionaisPercent on top of the base cost
                const baseCost = calcularCustoEmpresa(c, { ...config, adicionais_percentual: 0 });
                const custoSimulado = baseCost * (1 + adicionaisPercent / 100);
                
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.cargo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {activity ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <Briefcase className="w-2.5 h-2.5" />
                          {activity.nome}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {currencyFormatter.format(salarioEfetivo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono font-bold">
                      {currencyFormatter.format(custoSimulado)}
                    </td>
                  </tr>
                );
              })}
              {filteredColaboradores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400 italic">
                    Nenhum colaborador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StrategicSimulationPage;
