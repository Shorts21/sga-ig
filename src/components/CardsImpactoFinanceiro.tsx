import React from 'react';
import { Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ImpactCardProps {
  title: string;
  currentValue: number;
  simulatedValue: number;
  isCurrency?: boolean;
  icon: React.ElementType;
}

const ImpactCard: React.FC<ImpactCardProps> = ({ title, currentValue, simulatedValue, isCurrency = false, icon: Icon }) => {
  const difference = simulatedValue - currentValue;
  const percentageChange = currentValue === 0 ? 0 : (difference / currentValue) * 100;

  const formatValue = (value: number) => {
    if (isCurrency) {
      return `R$ ${Math.round(value / 1000)}k`;
    }
    return Math.round(value).toLocaleString('pt-BR');
  };

  const isIncrease = difference > 0;
  const isNeutral = difference === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className="p-2 bg-slate-50 rounded-lg">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-slate-900">{formatValue(simulatedValue)}</span>
          {!isNeutral && (
            <div className={`flex items-center text-xs font-medium ${isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(percentageChange).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">Base: {formatValue(currentValue)}</p>
      </div>
    </div>
  );
};

interface CardsImpactoFinanceiroProps {
    currentHeadcount: number;
    simulatedHeadcount: number;
    currentCost: number;
    simulatedCost: number;
}

const CardsImpactoFinanceiro: React.FC<CardsImpactoFinanceiroProps> = ({
    currentHeadcount,
    simulatedHeadcount,
    currentCost,
    simulatedCost
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImpactCard 
                title="Headcount Simulado"
                currentValue={currentHeadcount}
                simulatedValue={simulatedHeadcount}
                icon={Users}
            />
            <ImpactCard 
                title="Custo Simulado"
                currentValue={currentCost}
                simulatedValue={simulatedCost}
                isCurrency
                icon={DollarSign}
            />
        </div>
    );
};

export default CardsImpactoFinanceiro;
