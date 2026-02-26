import React, { useState } from 'react';
import { Pivot } from '../types';
import { supabase } from '../services/supabase';

interface TabelaHeadcountProps {
  pivots: Pivot[];
  custoPorColaborador: number;
  onUpdate: () => void;
}

const TabelaHeadcount: React.FC<TabelaHeadcountProps> = ({ pivots, custoPorColaborador, onUpdate }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Pivot>>({});

  const handleEdit = (pivot: Pivot) => {
    setEditingId(pivot.pivo_id);
    setEditData({
      trabalhadores_min: pivot.trabalhadores_min || 0,
      trabalhadores_ideal: pivot.trabalhadores_ideal || 0,
      trabalhadores_max: pivot.trabalhadores_max || 0,
      trabalhadores_atual: pivot.trabalhadores_atual || 0,
      custos_adicionais: pivot.custos_adicionais || 0,
    });
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pivos')
        .update(editData)
        .eq('id', id);

      if (error) throw error;
      onUpdate();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating headcount:', error);
      alert('Erro ao atualizar dados.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleChange = (field: keyof Pivot, value: string) => {
    setEditData(prev => ({ ...prev, [field]: Number(value) }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pivô</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área (ha)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ideal</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Máximo</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Atual</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Adicional</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Custo Total (CLT + Adicional)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pivots.map((pivot) => {
              const isEditing = editingId === pivot.pivo_id;
              const custoCLT = (isEditing ? (editData.trabalhadores_atual || 0) : (pivot.trabalhadores_atual || 0)) * custoPorColaborador;
              const custoAdicional = isEditing ? (editData.custos_adicionais || 0) : (pivot.custos_adicionais || 0);
              const custoTotal = custoCLT + custoAdicional;

              return (
                <tr key={pivot.pivo_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pivot.pivo_nome}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pivot.area_ha?.toFixed(2)}</td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editData.trabalhadores_min} 
                        onChange={(e) => handleChange('trabalhadores_min', e.target.value)}
                        className="w-16 p-1 border rounded text-center"
                      />
                    ) : (
                      <span className="text-gray-500">{pivot.trabalhadores_min || '-'}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editData.trabalhadores_ideal} 
                        onChange={(e) => handleChange('trabalhadores_ideal', e.target.value)}
                        className="w-16 p-1 border rounded text-center bg-blue-50"
                      />
                    ) : (
                      <span className="text-blue-600 font-medium">{pivot.trabalhadores_ideal || '-'}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editData.trabalhadores_max} 
                        onChange={(e) => handleChange('trabalhadores_max', e.target.value)}
                        className="w-16 p-1 border rounded text-center"
                      />
                    ) : (
                      <span className="text-gray-500">{pivot.trabalhadores_max || '-'}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editData.trabalhadores_atual} 
                        onChange={(e) => handleChange('trabalhadores_atual', e.target.value)}
                        className="w-16 p-1 border rounded text-center font-bold"
                      />
                    ) : (
                      <span className={`font-bold ${
                        (pivot.trabalhadores_atual || 0) < (pivot.trabalhadores_min || 0) ? 'text-red-600' : 
                        (pivot.trabalhadores_atual || 0) > (pivot.trabalhadores_max || 999) ? 'text-orange-500' : 'text-green-600'
                      }`}>
                        {pivot.trabalhadores_atual || 0}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editData.custos_adicionais} 
                        onChange={(e) => handleChange('custos_adicionais', e.target.value)}
                        className="w-24 p-1 border rounded text-right"
                      />
                    ) : (
                      <span className="text-gray-500">R$ {(pivot.custos_adicionais || 0).toFixed(2)}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    R$ {custoTotal.toFixed(2)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                    {isEditing ? (
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleSave(pivot.pivo_id)} className="text-green-600 hover:text-green-900">Salvar</button>
                        <button onClick={handleCancel} className="text-red-600 hover:text-red-900">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(pivot)} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TabelaHeadcount;
