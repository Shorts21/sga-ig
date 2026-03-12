import React from 'react';
import { Pivot, ConfiguracoesLegais } from '../types';
import { Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { calcularCustoPivo } from '../utils/custoOperacional';

interface SimulationPanelProps {
  pivo: Pivot;
  simulacaoTemp: Record<string, number>;
  setSimulacaoTemp: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  legalSettings: ConfiguracoesLegais | null;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({
  pivo,
  simulacaoTemp,
  setSimulacaoTemp,
  legalSettings
}) => {
  const diff = simulacaoTemp[pivo.pivo_id] || 0;

  const config = legalSettings || {
    salario_minimo: 1621,
    adicionais_percentual: 0,
    inss_empresa_percentual: 20,
    fgts_percentual: 8,
    rat_percentual: 2,
    terceiros_percentual: 5.8,
    provisao_ferias_percentual: 11.11,
    provisao_13_percentual: 8.33
  };

  const encargosPercentual = config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual + config.provisao_ferias_percentual + config.provisao_13_percentual;

  const currentHeadcount = pivo.headcount || 0;
  const simulatedHeadcount = currentHeadcount + diff;

  // Assuming an average salary for simulation if not provided
  const avgSalary = 2500;

  const { custoTotal, custoPorHectare } = calcularCustoPivo({
    headcount: simulatedHeadcount,
    salarioBase: avgSalary,
    adicionaisPercentual: config.adicionais_percentual,
    encargosPercentual: encargosPercentual,
    areaHa: pivo.area_ha
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSimulacaoTemp(prev => ({
      ...prev,
      [pivo.pivo_id]: val
    }));
  };

  const resetSimulation = () => {
    setSimulacaoTemp(prev => {
      const { [pivo.pivo_id]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Simulação de Contratação</h3>
          <button
            onClick={resetSimulation}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
          >
            Resetar
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <input
              type="range"
              min={-currentHeadcount}
              max="20"
              value={diff}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div className={`text-xl font-mono font-bold w-12 text-center ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-white'}`}>
            {diff > 0 ? `+${diff}` : diff}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Novo Headcount</div>
            <div className="text-xl font-bold">{simulatedHeadcount}</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Custo / ha</div>
            <div className={`text-xl font-bold ${custoPorHectare > 120 ? 'text-rose-400' : 'text-emerald-400'}`}>
              R$ {custoPorHectare.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Impacto no Custo</div>
              <div className="text-sm font-bold text-slate-900">
                R$ {custoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/mês
              </div>
            </div>
          </div>
          {diff !== 0 && (
            <div className={`text-xs font-bold ${diff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {diff > 0 ? 'Aumento' : 'Economia'}
            </div>
          )}
        </div>

        {custoPorHectare > 120 && (
          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-rose-800">Alerta de Ineficiência</div>
              <div className="text-[11px] text-rose-700 leading-tight mt-0.5">
                O custo por hectare está acima do limite ideal (R$ 120/ha). Considere otimizar o headcount.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h4 className="text-[11px] font-bold text-slate-500 uppercase">Impacto Geográfico</h4>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${custoPorHectare < 50 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <div className={`w-3 h-3 rounded-full ${custoPorHectare >= 50 && custoPorHectare < 120 ? 'bg-amber-500' : 'bg-slate-300'}`} />
            <div className={`w-3 h-3 rounded-full ${custoPorHectare >= 120 ? 'bg-rose-500' : 'bg-slate-300'}`} />
          </div>
          <div className="text-[10px] font-bold text-slate-500 italic">
            Visualização em Mapa Atualizada
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
