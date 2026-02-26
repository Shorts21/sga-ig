import React, { useState, useEffect } from 'react';
import { Pivot } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SimulationPanelProps {
  pivo: Pivot;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ pivo }) => {
  // Simulation Parameters
  const [irrigationFreq, setIrrigationFreq] = useState<number>(3); // days
  const [waterAmount, setWaterAmount] = useState<number>(10); // mm per application
  const [fertilizer, setFertilizer] = useState<number>(150); // kg/ha

  // Constants (Simulated)
  const baseYield = 60; // tons/ha (e.g., Sugarcane or Corn silage)
  const pricePerTon = 150; // R$
  const costWaterPerMm = 12; // R$/mm/ha (energy + water)
  const costFertilizerPerKg = 4.5; // R$/kg

  // Results State
  const [results, setResults] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    calculateSimulation();
  }, [irrigationFreq, waterAmount, fertilizer, pivo]);

  const calculateSimulation = () => {
    const area = pivo.area_ha || 0;
    
    // --- Yield Calculation (Simplified Model) ---
    // Optimal water is ~30mm/week. 
    // Current weekly water = (7 / freq) * amount
    const weeklyWater = (7 / irrigationFreq) * waterAmount;
    const waterFactor = Math.max(0, 1 - Math.abs(30 - weeklyWater) / 50); // Bell curve peak at 30mm
    
    // Optimal fertilizer ~200kg/ha
    const fertilizerFactor = Math.min(1.2, 0.5 + (fertilizer / 400)); // Diminishing returns

    const simulatedYieldPerHa = baseYield * (0.5 + (0.5 * waterFactor)) * fertilizerFactor;
    const totalYield = simulatedYieldPerHa * area;
    const totalRevenue = totalYield * pricePerTon;

    // --- Cost Calculation ---
    // Monthly applications = 30 / freq
    const monthlyWaterCost = (30 / irrigationFreq) * waterAmount * costWaterPerMm * area;
    const fertilizerCost = fertilizer * costFertilizerPerKg * area; // One-time/seasonal cost spread? Let's assume monthly for simplicity or seasonal.
    // Let's assume these are monthly operational costs for the simulation window.
    
    const baseOperationalCost = pivo.custo_total_calculado || 0;
    const totalCost = baseOperationalCost + monthlyWaterCost + (fertilizerCost / 6); // Spread fertilizer over 6 months

    const netProfit = totalRevenue - totalCost; // Revenue is likely seasonal, but let's just show "Potential Value"

    setResults({
      yieldPerHa: simulatedYieldPerHa,
      totalYield,
      totalRevenue,
      totalCost,
      netProfit,
      waterFactor,
      fertilizerFactor
    });

    // Generate Chart Data (Sensitivity Analysis)
    // Vary water amount to show optimal point
    const data = [];
    for (let w = 5; w <= 50; w += 5) {
      const wWeekly = (7 / irrigationFreq) * w;
      const wFactor = Math.max(0, 1 - Math.abs(30 - wWeekly) / 50);
      const y = baseYield * (0.5 + (0.5 * wFactor)) * fertilizerFactor;
      data.push({
        water: w,
        yield: y,
        revenue: y * area * pricePerTon,
        cost: baseOperationalCost + ((30 / irrigationFreq) * w * costWaterPerMm * area) + (fertilizerCost / 6)
      });
    }
    setChartData(data);
  };

  if (!pivo) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 border-b pb-2">Simulação de Cenários</h3>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Frequência de Irrigação (dias)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="1"
                max="14"
                value={irrigationFreq}
                onChange={(e) => setIrrigationFreq(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold w-12 text-right">{irrigationFreq} dias</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Lâmina de Água (mm)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="5"
                max="50"
                value={waterAmount}
                onChange={(e) => setWaterAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold w-12 text-right">{waterAmount} mm</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fertilizante (kg/ha)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={fertilizer}
                onChange={(e) => setFertilizer(parseInt(e.target.value))}
                className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold w-12 text-right">{fertilizer} kg</span>
            </div>
          </div>
        </div>

        {/* Results Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded border border-blue-100">
            <p className="text-xs text-blue-600 font-semibold">Produtividade Est.</p>
            <p className="text-lg font-bold text-blue-900">
              {results?.yieldPerHa.toFixed(1)} <span className="text-xs font-normal">ton/ha</span>
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded border border-green-100">
            <p className="text-xs text-green-600 font-semibold">Receita Potencial</p>
            <p className="text-lg font-bold text-green-900">
              R$ {(results?.totalRevenue / 1000).toFixed(1)}k
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded border border-red-100">
            <p className="text-xs text-red-600 font-semibold">Custo Operacional</p>
            <p className="text-lg font-bold text-red-900">
              R$ {(results?.totalCost / 1000).toFixed(1)}k
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold">Margem Líquida</p>
            <p className={`text-lg font-bold ${results?.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              R$ {(results?.netProfit / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="h-48 w-full mt-4">
        <p className="text-xs text-center text-gray-500 mb-2">Curva de Produtividade x Água (mm)</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="water" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ fontSize: '12px', borderRadius: '4px' }}
              formatter={(value: number) => [value.toFixed(1), '']}
            />
            <Line type="monotone" dataKey="yield" stroke="#2563eb" strokeWidth={2} dot={false} name="Produtividade (t/ha)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationPanel;
