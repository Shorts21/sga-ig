import React, { useState, useEffect } from 'react';
import { AggregatedPivotData, aggregateData } from '../services/aggregationService';
import { Colaborador, ConfiguracoesLegais } from '../types';
import { Users, DollarSign, Briefcase, TrendingUp } from 'lucide-react';
import { getSalarioEfetivo, calcularCustoEmpresa } from '../utils/financialUtils';

const HrFinancePage: React.FC = () => {
  const [aggregatedData, setAggregatedData] = useState<AggregatedPivotData[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aggData, colabRes, legalRes] = await Promise.all([
          aggregateData(),
          fetch('/api/colaboradores'),
          fetch('/api/configuracoes-legais')
        ]);
        setAggregatedData(aggData);
        if (colabRes.ok) setColaboradores(await colabRes.json());
        if (legalRes.ok) setLegalSettings(await legalRes.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-slate-500 font-medium">Carregando dados financeiros...</div>;
  if (error) return <div className="flex justify-center items-center h-screen text-rose-600 font-medium">Erro: {error}</div>;

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

  const totalCustoReal = aggregatedData.reduce((sum, d) => sum + d.custo_real, 0);
  const totalColaboradores = aggregatedData.reduce((sum, d) => sum + d.total_colaboradores, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Recursos Humanos & Financeiro</h1>
          <p className="text-sm text-slate-500">Gestão de custos reais e folha de pagamento</p>
        </div>
      </div>

      {/* Resumo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Custo Mensal Total</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {totalCustoReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Incluindo encargos e provisões</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Total de Colaboradores</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalColaboradores}</div>
          <p className="text-xs text-slate-400 mt-1">Ativos em campo</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-500">Custo Médio / Pessoa</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {(totalColaboradores > 0 ? totalCustoReal / totalColaboradores : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Custo empresa real</p>
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Custos por Pivô */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">Custos por Unidade Operacional</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pivô</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qtd</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Real</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedData.map((data) => (
                  <tr key={data.pivo_nome} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{data.pivo_nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{data.total_colaboradores}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono font-bold">
                      {data.custo_real.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhamento de Colaboradores */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-900">Detalhamento de Colaboradores</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salário Efetivo</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo Empresa</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {colaboradores.map((c) => {
                  const salarioEfetivo = getSalarioEfetivo(c, config);
                  const custoEmpresa = c.custo_empresa_calculado || calcularCustoEmpresa(c, config);
                  
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.nome}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.cargo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                        {salarioEfetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-mono font-bold">
                        {custoEmpresa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrFinancePage;
