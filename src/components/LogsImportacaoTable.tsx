import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface LogImportacao {
  id: string;
  created_at: string;
  filename: string;
  status: 'success' | 'error' | 'processing';
  message: string;
  user_id: string;
}

const LogsImportacaoTable: React.FC = () => {
  const [logs, setLogs] = useState<LogImportacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // In a real scenario, we would fetch from a 'import_logs' table
        // For now, let's mock some data or try to fetch if the table exists
        // const { data, error } = await supabase.from('import_logs').select('*').order('created_at', { ascending: false });
        
        // Mock data for demonstration as the table might not exist yet
        const mockLogs: LogImportacao[] = [
          { id: '1', created_at: new Date().toISOString(), filename: 'headcount_fev_2026.xlsx', status: 'success', message: 'Importação concluída com sucesso.', user_id: 'user-1' },
          { id: '2', created_at: new Date(Date.now() - 86400000).toISOString(), filename: 'custos_jan_2026.xlsx', status: 'error', message: 'Erro na linha 42: Formato inválido.', user_id: 'user-1' },
          { id: '3', created_at: new Date(Date.now() - 172800000).toISOString(), filename: 'pivos_atualizacao.xlsx', status: 'success', message: '15 registros atualizados.', user_id: 'user-2' },
        ];
        setLogs(mockLogs);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) return <div className="text-center py-4">Carregando logs...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Histórico de Importações</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arquivo</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensagem</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    log.status === 'success' ? 'bg-green-100 text-green-800' : 
                    log.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? 'Erro' : 'Processando'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                  {log.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsImportacaoTable;
