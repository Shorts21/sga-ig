import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GraficoComparativoProps {
  currentCost: number;
  simulatedCost: number;
}

const GraficoComparativo: React.FC<GraficoComparativoProps> = ({ currentCost, simulatedCost }) => {
  const data = [
    {
      name: 'Custo Mensal',
      Atual: currentCost,
      Simulado: simulatedCost,
    },
    {
      name: 'Custo Anual',
      Atual: currentCost * 12,
      Simulado: simulatedCost * 12,
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-96">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Comparativo Financeiro</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
          />
          <Legend />
          <Bar dataKey="Atual" fill="#9ca3af" name="Cenário Atual" />
          <Bar dataKey="Simulado" fill="#2563eb" name="Cenário Simulado" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoComparativo;
