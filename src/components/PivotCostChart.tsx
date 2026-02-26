import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Pivot } from '../types';

interface PivotCostChartProps {
  data: Pivot[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
        <p className="font-bold text-gray-800">{label}</p>
        <p className="text-sm text-blue-600">{`Custo: R$ ${payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
      </div>
    );
  }
  return null;
};

const PivotCostChart: React.FC<PivotCostChartProps> = ({ data }) => {
  const chartData = data
    .filter(p => p.custo_total_calculado > 0)
    .sort((a, b) => b.custo_total_calculado - a.custo_total_calculado)
    .slice(0, 10); // Show top 10 pivots by cost

  if (chartData.length === 0) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm h-64 flex items-center justify-center">
            <p className="text-gray-500">Dados de custo insuficientes para exibir o gráfico.</p>
        </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Custo Total por Pivô</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart 
                    data={chartData} 
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    layout="vertical"
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `R$ ${Number(value) / 1000}k`} />
                    <YAxis 
                        type="category" 
                        dataKey="pivo_nome" 
                        width={120} 
                        tick={{ fontSize: 12 }}
                        interval={0}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240, 240, 240, 0.5)' }} />
                    <Bar dataKey="custo_total_calculado" name="Custo Total" barSize={20}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default PivotCostChart;
