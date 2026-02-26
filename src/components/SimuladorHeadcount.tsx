import React, { useState } from 'react';

interface SimuladorHeadcountProps {
  onStrategyChange: (strategy: 'conservador' | 'equilibrio' | 'expansao' | 'custom', percent: number) => void;
}

const SimuladorHeadcount: React.FC<SimuladorHeadcountProps> = ({ onStrategyChange }) => {
  const [strategy, setStrategy] = useState<'conservador' | 'equilibrio' | 'expansao' | 'custom'>('equilibrio');
  const [customPercent, setCustomPercent] = useState<number>(0);

  const handleStrategyClick = (newStrategy: 'conservador' | 'equilibrio' | 'expansao') => {
    setStrategy(newStrategy);
    let percent = 0;
    if (newStrategy === 'conservador') percent = -10;
    if (newStrategy === 'expansao') percent = 10;
    onStrategyChange(newStrategy, percent);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomPercent(val);
    setStrategy('custom');
    onStrategyChange('custom', val);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Estratégia de Headcount</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => handleStrategyClick('conservador')}
          className={`p-4 rounded-lg border text-center transition-colors ${
            strategy === 'conservador' 
              ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-bold mb-1">Conservador</div>
          <div className="text-xs opacity-75">Redução de 10%</div>
        </button>

        <button
          onClick={() => handleStrategyClick('equilibrio')}
          className={`p-4 rounded-lg border text-center transition-colors ${
            strategy === 'equilibrio' 
              ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-200' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-bold mb-1">Equilíbrio</div>
          <div className="text-xs opacity-75">Manter Atual</div>
        </button>

        <button
          onClick={() => handleStrategyClick('expansao')}
          className={`p-4 rounded-lg border text-center transition-colors ${
            strategy === 'expansao' 
              ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-200' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="font-bold mb-1">Expansão</div>
          <div className="text-xs opacity-75">Aumento de 10%</div>
        </button>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ajuste Personalizado (%)
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            min="-50"
            max="50"
            value={strategy === 'custom' ? customPercent : (strategy === 'conservador' ? -10 : strategy === 'expansao' ? 10 : 0)}
            onChange={handleCustomChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="w-16 text-right font-mono font-bold">
            {strategy === 'custom' ? customPercent : (strategy === 'conservador' ? -10 : strategy === 'expansao' ? 10 : 0)}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ajuste percentual sobre o quadro atual de colaboradores.
        </p>
      </div>
    </div>
  );
};

export default SimuladorHeadcount;
