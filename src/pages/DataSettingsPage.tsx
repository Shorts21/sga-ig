import React, { useState, useEffect } from 'react';
import { processSpreadsheetAndInsertSupabase, ProcessResult } from '../services/spreadsheetService';
import { ConfiguracoesLegais, TipoAtividade } from '../types';
import { Settings, Scale, Briefcase, Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const DataSettingsPage: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);

  // HR Config State
  const [legalSettings, setLegalSettings] = useState<ConfiguracoesLegais>({
    id: '',
    salario_minimo: 1412,
    inss_empresa_percentual: 20,
    fgts_percentual: 8,
    rat_percentual: 2,
    terceiros_percentual: 5.8,
    provisao_ferias_percentual: 11.11,
    provisao_13_percentual: 8.33,
    adicionais_percentual: 0
  });
  const [activityTypes, setActivityTypes] = useState<TipoAtividade[]>([]);
  const [isSavingLegal, setIsSavingLegal] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [legalRes, activityRes] = await Promise.all([
        fetch('/api/configuracoes-legais'),
        fetch('/api/tipos-atividade')
      ]);
      
      if (legalRes.ok) setLegalSettings(await legalRes.json());
      if (activityRes.ok) setActivityTypes(await activityRes.json());
    } catch (err) {
      console.error('Failed to fetch configs', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const res = await processSpreadsheetAndInsertSupabase(file);
      setResult(res);
      
      if (res.success) {
        setSuccess('File uploaded and processed successfully!');
      } else if (res.errors.length > 0) {
        setError(`Erro ao processar planilha: ${res.errors.join(', ')}`);
      } else {
        setSuccess('Processamento concluído com avisos.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao processar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLegal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalSettings) return;
    
    setIsSavingLegal(true);
    try {
      const res = await fetch('/api/configuracoes-legais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(legalSettings)
      });
      if (res.ok) {
        setSuccess('Configurações legais salvas com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Falha ao salvar configurações legais.');
    } finally {
      setIsSavingLegal(false);
    }
  };

  const handleAddActivity = () => {
    const newActivity: TipoAtividade = {
      id: crypto.randomUUID(),
      nome: 'Nova Atividade',
      salario_base: 1412,
      carga_horaria: 220,
      insalubridade_percentual: 0,
      periculosidade_percentual: 0,
      hora_extra_percentual: 50,
      adicional_noturno_percentual: 20
    };
    setActivityTypes([...activityTypes, newActivity]);
  };

  const handleSaveActivity = async (activity: TipoAtividade) => {
    setIsSavingActivity(true);
    try {
      const res = await fetch('/api/tipos-atividade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      if (res.ok) {
        setSuccess(`Atividade "${activity.nome}" salva!`);
        setTimeout(() => setSuccess(null), 3000);
        fetchConfigs();
      }
    } catch (err) {
      setError('Falha ao salvar atividade.');
    } finally {
      setIsSavingActivity(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dados & Configurações</h1>
          <p className="text-sm text-slate-500">Gestão de parâmetros operacionais e financeiros</p>
        </div>
      </div>

      {/* 1. Configurações Trabalhistas e Custos Operacionais */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Bloco 1: Configurações Legais Globais */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-bottom border-gray-100 bg-slate-50 flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Configurações Legais Globais</h2>
            </div>
            <form onSubmit={handleSaveLegal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Salário Mínimo Base (R$)</label>
                <input 
                  type="number" 
                  value={legalSettings.salario_minimo}
                  onChange={(e) => setLegalSettings({...legalSettings, salario_minimo: parseFloat(e.target.value)})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none"
                />
              </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">INSS Empresa (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.inss_empresa_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, inss_empresa_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">FGTS (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.fgts_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, fgts_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">RAT (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.rat_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, rat_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Terceiros (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.terceiros_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, terceiros_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Provisão Férias (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.provisao_ferias_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, provisao_ferias_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Provisão 13º (%)</label>
                      <input 
                        type="number" 
                        value={legalSettings.provisao_13_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, provisao_13_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Adicionais (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        max="300"
                        value={legalSettings.adicionais_percentual}
                        onChange={(e) => setLegalSettings({...legalSettings, adicionais_percentual: parseFloat(e.target.value)})}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isSavingLegal}
                    className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingLegal ? 'Salvando...' : 'Salvar Configurações'}
                  </button>
            </form>
          </div>
        </div>

        {/* Bloco 2: Tipos de Atividade */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-bottom border-gray-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Tipos de Atividade</h2>
              </div>
              <button 
                onClick={handleAddActivity}
                className="text-xs font-bold text-slate-900 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Adicionar Tipo
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome da Atividade</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salário Base</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carga Horária</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adicionais (%)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activityTypes.map((type) => (
                    <tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={type.nome}
                          onChange={(e) => setActivityTypes(activityTypes.map(t => t.id === type.id ? {...t, nome: e.target.value} : t))}
                          className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-700"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={type.salario_base}
                          onChange={(e) => setActivityTypes(activityTypes.map(t => t.id === type.id ? {...t, salario_base: parseFloat(e.target.value)} : t))}
                          className="w-24 text-sm bg-transparent border-none focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={type.carga_horaria}
                          onChange={(e) => setActivityTypes(activityTypes.map(t => t.id === type.id ? {...t, carga_horaria: parseFloat(e.target.value)} : t))}
                          className="w-16 text-sm bg-transparent border-none focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 text-[10px] text-slate-400">
                          <span>Ins: {type.insalubridade_percentual}%</span>
                          <span>Per: {type.periculosidade_percentual}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleSaveActivity(type)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                            title="Salvar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setActivityTypes(activityTypes.filter(t => t.id !== type.id))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Importação de Planilha */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Importar Planilha Operacional</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">Selecione uma planilha Excel (.xlsx) para atualizar poligonais, pivôs e colaboradores.</p>
        
        <div className="max-w-xl">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <p className="mb-2 text-sm text-slate-500 font-medium">Clique para selecionar ou arraste o arquivo</p>
              <p className="text-xs text-slate-400">XLSX, XLS (Máx. 10MB)</p>
            </div>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-600 font-medium">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            Processando dados da planilha...
          </div>
        )}
        
        {error && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}
        
        {result && (
          <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resumo da Importação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <p className="text-xs text-slate-500">Poligonais</p>
                <p className="text-lg font-semibold text-slate-900">{result.inserted_poligonais}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <p className="text-xs text-slate-500">Pivôs</p>
                <p className="text-lg font-semibold text-slate-900">{result.inserted_pivos}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <p className="text-xs text-slate-500">Colaboradores</p>
                <p className="text-lg font-semibold text-slate-900">{result.inserted_colaboradores}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSettingsPage;
