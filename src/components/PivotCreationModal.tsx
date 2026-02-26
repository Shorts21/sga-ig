import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface PivotCreationModalProps {
  position: { lat: number; lng: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PivotCreationModal: React.FC<PivotCreationModalProps> = ({ position, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    pivo_nome: '',
    area_ha: 0,
    headcount: 0,
    custo_total_calculado: 0,
  });
  const [loading, setLoading] = useState(false);

  if (!position) return null;

  const calculateEstimates = () => {
    // Simple estimation logic: 
    // Cost ~ R$ 3500 per headcount + R$ 500 per ha (maintenance)
    const estimatedCost = (formData.headcount * 3500) + (formData.area_ha * 500);
    setFormData(prev => ({ ...prev, custo_total_calculado: estimatedCost }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.area_ha <= 0) {
      alert('A área deve ser um valor positivo.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('pivos')
        .insert([
          {
            nome: formData.pivo_nome,
            area_hectares: formData.area_ha, // Map to 'area_hectares' column in DB
            headcount: formData.headcount,
            custo_total_calculado: formData.custo_total_calculado,
            latitude: position.lat,
            longitude: position.lng,
            trabalhadores_atual: formData.headcount,
          }
        ]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating pivot:', error);
      alert(`Erro ao criar pivô: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[2000]">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl border border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Novo Pivô</h3>
            <p className="text-xs text-gray-500 font-mono mt-1">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Pivô</label>
            <input
              type="text"
              required
              value={formData.pivo_nome}
              onChange={(e) => setFormData({ ...formData, pivo_nome: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
              placeholder="Ex: Pivô 05"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Área (ha)</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.area_ha}
                onChange={(e) => setFormData({ ...formData, area_ha: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Headcount</label>
              <input
                type="number"
                min="0"
                value={formData.headcount}
                onChange={(e) => setFormData({ ...formData, headcount: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Custo Estimado (R$)</label>
              <button 
                type="button"
                onClick={calculateEstimates}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Calcular Sugestão
              </button>
            </div>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.custo_total_calculado}
                onChange={(e) => setFormData({ ...formData, custo_total_calculado: parseFloat(e.target.value) })}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Valor mensal estimado para operação.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Criar Pivô'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PivotCreationModal;
