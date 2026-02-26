import React, { useState, useEffect } from 'react';
import { Pivot, Colaborador } from '../types';
import { supabase } from '../services/supabase';
import SimulationPanel from './SimulationPanel';

interface DrawerDetalhesPivoProps {
  pivo: Pivot | null;
  onClose: () => void;
  onUpdate: () => void;
}

const DrawerDetalhesPivo: React.FC<DrawerDetalhesPivoProps> = ({ pivo, onClose, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Pivot>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'simulation'>('details');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  useEffect(() => {
    if (pivo) {
      const fetchColaboradores = async () => {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('pivo_id', pivo.pivo_id);
        if (error) {
          console.error('Error fetching collaborators:', error);
        } else {
          setColaboradores(data);
        }
      };
      fetchColaboradores();
    }
  }, [pivo]);

  if (!pivo) return null;

  const handleEdit = () => {
    setFormData({
      trabalhadores_min: pivo.trabalhadores_min || 0,
      trabalhadores_ideal: pivo.trabalhadores_ideal || 0,
      trabalhadores_max: pivo.trabalhadores_max || 0,
      trabalhadores_atual: pivo.trabalhadores_atual || pivo.headcount || 0, // Default to headcount if not set
      custos_adicionais: pivo.custos_adicionais || 0,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('pivos')
        .update(formData)
        .eq('id', pivo.pivo_id);

      if (error) throw error;
      onUpdate();
      setEditing(false);
    } catch (error) {
      console.error('Error updating pivot:', error);
      alert('Erro ao atualizar pivô.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este pivô?')) return;

    try {
      const { error } = await supabase
        .from('pivos')
        .delete()
        .eq('id', pivo.pivo_id);

      if (error) throw error;
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting pivot:', error);
      alert('Erro ao excluir pivô.');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{pivo.pivo_nome}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
              title="Excluir Pivô"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('details')}
          >
            Detalhes
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'simulation' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('simulation')}
          >
            Simulação
          </button>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Dados Gerais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Área (ha)</p>
                  <p className="font-medium">{pivo.area_ha?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Headcount Atual</p>
                  <p className="font-medium">{pivo.headcount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custo Estimado</p>
                  <p className="font-medium">R$ {pivo.custo_total_calculado?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Colaboradores ({colaboradores.length})</h3>
              <div className="max-h-48 overflow-y-auto pr-2">
                {colaboradores.length > 0 ? (
                  <ul className="space-y-2">
                    {colaboradores.map(c => (
                      <li key={c.id} className="flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium text-gray-800">{c.nome}</p>
                          <p className="text-xs text-gray-500">{c.cargo}</p>
                        </div>
                        <p className="font-mono text-xs text-gray-600">R$ {c.salario.toFixed(2)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 italic">Nenhum colaborador alocado.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Parâmetros Operacionais</h3>
                {!editing && (
                  <button 
                    onClick={handleEdit}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Editar
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Trabalhadores Atual</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.trabalhadores_atual}
                      onChange={(e) => setFormData({ ...formData, trabalhadores_atual: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Trabalhadores Mínimo</label>
                    <input
                      type="number"
                      value={formData.trabalhadores_min}
                      onChange={(e) => setFormData({ ...formData, trabalhadores_min: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Trabalhadores Ideal</label>
                    <input
                      type="number"
                      value={formData.trabalhadores_ideal}
                      onChange={(e) => setFormData({ ...formData, trabalhadores_ideal: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Trabalhadores Máximo</label>
                    <input
                      type="number"
                      value={formData.trabalhadores_max}
                      onChange={(e) => setFormData({ ...formData, trabalhadores_max: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Custos Adicionais (R$)</label>
                    <input
                      type="number"
                      value={formData.custos_adicionais}
                      onChange={(e) => setFormData({ ...formData, custos_adicionais: parseFloat(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Atual</p>
                    <p className="font-medium">{pivo.trabalhadores_atual || pivo.headcount || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mínimo</p>
                    <p className="font-medium">{pivo.trabalhadores_min || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ideal</p>
                    <p className="font-medium">{pivo.trabalhadores_ideal || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Máximo</p>
                    <p className="font-medium">{pivo.trabalhadores_max || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Custos Adicionais</p>
                    <p className="font-medium">R$ {pivo.custos_adicionais?.toFixed(2) || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <SimulationPanel pivo={pivo} />
        )}
      </div>
    </div>
  );
};

export default DrawerDetalhesPivo;
