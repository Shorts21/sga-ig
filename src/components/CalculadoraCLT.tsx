import React, { useState, useEffect } from 'react';

interface CalculadoraCLTProps {
  onCustosChange: (custoTotal: number) => void;
}

const CalculadoraCLT: React.FC<CalculadoraCLTProps> = ({ onCustosChange }) => {
  const [salarioBase, setSalarioBase] = useState<number>(2000);
  const [encargos, setEncargos] = useState({
    inss: 0,
    fgts: 0,
    rat: 0,
    terceiros: 0,
    provisoes: 0,
    total: 0
  });

  useEffect(() => {
    // Simplified CLT calculation logic (estimates)
    // INSS Patronal (~20%)
    const inss = salarioBase * 0.20;
    // FGTS (8%)
    const fgts = salarioBase * 0.08;
    // RAT (~2% average)
    const rat = salarioBase * 0.02;
    // Terceiros (~5.8%)
    const terceiros = salarioBase * 0.058;
    // Provisões (Férias + 1/3, 13º, Multa FGTS ~ 28%)
    const provisoes = salarioBase * 0.28;

    const totalEncargos = inss + fgts + rat + terceiros + provisoes;
    const custoTotal = salarioBase + totalEncargos;

    setEncargos({
      inss,
      fgts,
      rat,
      terceiros,
      provisoes,
      total: custoTotal
    });

    onCustosChange(custoTotal);
  }, [salarioBase, onCustosChange]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Simulador de Custo CLT</h3>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Salário Base Médio (R$)
        </label>
        <input
          type="number"
          value={salarioBase}
          onChange={(e) => setSalarioBase(Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>INSS Patronal (20%)</span>
          <span>R$ {encargos.inss.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>FGTS (8%)</span>
          <span>R$ {encargos.fgts.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>RAT / SAT (~2%)</span>
          <span>R$ {encargos.rat.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Outras Entidades (5.8%)</span>
          <span>R$ {encargos.terceiros.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 border-b pb-2">
          <span>Provisões (Férias, 13º...)</span>
          <span>R$ {encargos.provisoes.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between font-bold text-lg text-blue-800 pt-2">
          <span>Custo Total por Colaborador</span>
          <span>R$ {encargos.total.toFixed(2)}</span>
        </div>
        <div className="text-xs text-gray-400 text-right mt-1">
          Multiplicador: {(encargos.total / (salarioBase || 1)).toFixed(2)}x
        </div>
      </div>
    </div>
  );
};

export default CalculadoraCLT;
