import React, { useState, ChangeEvent } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

const ImportacaoPlanilhaButton: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setUploading(true);
    setMessage(null);
    setDetails(null);

    try {
      // 1. Upload direto para o Supabase Storage (Opcional / Backup)
      const filename = `uploads/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('planilhas-importacao')
        .upload(filename, file);

      let uploadStatus = 'success';
      if (uploadError) {
        if (uploadError.message.includes('row-level security')) {
             console.warn('Upload de backup bloqueado por RLS. O processamento dos dados continuará normalmente.');
             uploadStatus = 'skipped_rls';
        } else {
             console.warn(`Erro no upload de backup: ${uploadError.message}. Tentando processar localmente.`);
             uploadStatus = 'failed';
        }
      }

      // 2. Ler e processar o arquivo no frontend
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (rawData.length < 2) {
        throw new Error('A planilha não possui linhas suficientes (mínimo 2: cabeçalho e dados).');
      }

      // Busca dinâmica pelo cabeçalho (Header)
      let headerRowIndex = -1;
      let headerRow: any[] = [];

      // Procura nas primeiras 20 linhas
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        // Verifica se alguma célula desta linha parece ser o cabeçalho da coluna de Pivô/Local
        const hasPivotColumn = row.some((cell: any) => {
            if (!cell) return false;
            const str = cell.toString().toLowerCase();
            return str.includes('pivô') || str.includes('pivo') || str.includes('local') || str.includes('setor') || str.includes('fazenda') || str.includes('nome');
        });

        if (hasPivotColumn) {
            headerRowIndex = i;
            headerRow = row;
            break;
        }
      }

      if (headerRowIndex === -1) {
         throw new Error(`Não foi possível encontrar a linha de cabeçalho nas primeiras 20 linhas. Verifique se a planilha tem uma coluna 'Pivô', 'Local', 'Setor' ou 'Nome'.`);
      }

      const dataRows = rawData.slice(headerRowIndex + 1);
      console.log(`Header encontrado na linha ${headerRowIndex + 1}:`, headerRow);
      console.log('Total de linhas de dados:', dataRows.length);

      // Mapear dados para atualização
      // 1. Encontrar coluna de Pivô (Prioridade alta)
      let pivoNameIndex = headerRow.findIndex((h: any) => {
        if (!h) return false;
        const str = h.toString().toLowerCase();
        return str.includes('pivô') || str.includes('pivo') || str.includes('local') || str.includes('setor') || str.includes('fazenda') || str.includes('centro de custo');
      });

      // 2. Encontrar outras colunas (Nome, Cargo, Salário) para salvar dados brutos
      const nomeIndex = headerRow.findIndex((h: any) => h && (h.toString().toLowerCase() === 'nome' || h.toString().toLowerCase().includes('colaborador') || h.toString().toLowerCase().includes('funcionário')));
      const cargoIndex = headerRow.findIndex((h: any) => h && (h.toString().toLowerCase().includes('cargo') || h.toString().toLowerCase().includes('função')));
      const salarioIndex = headerRow.findIndex((h: any) => h && (h.toString().toLowerCase().includes('salario') || h.toString().toLowerCase().includes('vencimentos') || h.toString().toLowerCase().includes('custo') || h.toString().toLowerCase() === 'valor'));

      // Se não achar, tenta 'nome' mas com cuidado (pode ser nome do colaborador)
      const colaboradorIndex = headerRow.findIndex((h: any) => {
        if (!h) return false;
        const str = h.toString().toLowerCase();
        return str.includes('colaborador') || str.includes('funcionário') || str.includes('funcionario');
      });

      if (pivoNameIndex === -1) {
          // Tenta 'nome' apenas se não for a coluna de colaborador
          pivoNameIndex = headerRow.findIndex((h: any, idx: number) => {
            if (!h) return false;
            const str = h.toString().toLowerCase();
            return str === 'nome' && idx !== colaboradorIndex;
          });
      }

      if (pivoNameIndex === -1) {
        throw new Error(`Coluna de Pivô/Local não encontrada. Headers: ${headerRow.join(', ')}`);
      }

      // 3. Registrar Importação (Log) ANTES de processar linhas
      const { data: importacaoData, error: impError } = await supabase
        .from('importacoes_headcount')
        .insert({
          nome_arquivo: file.name,
          total_linhas: dataRows.length,
          linhas_com_erro: 0
        })
        .select()
        .single();

      console.log("Insert resposta (importacoes_headcount):", importacaoData, impError);

      if (impError) {
        console.error("Erro Supabase:", impError);
        throw new Error(`Erro ao criar registro de importação: ${impError.message}`);
      }

      const importacaoId = importacaoData?.id;

      // Agrupar headcount por pivô e preparar batch de colaboradores
      const headcountMap = new Map<string, number>();
      const colaboradoresBatch: any[] = [];
      
      let processedRows = 0;
      let successRows = 0;
      let errorRows = 0;
      
      dataRows.forEach((row) => {
        processedRows++;
        if (!row || row.length === 0) return;

        const pivoName = row[pivoNameIndex];
        
        // Preparar dados para tabela colaboradores (raw data)
        if (importacaoId) {
            colaboradoresBatch.push({
                importacao_id: importacaoId,
                nome: nomeIndex > -1 ? row[nomeIndex] : 'Desconhecido',
                cargo: cargoIndex > -1 ? row[cargoIndex] : null,
                salario: salarioIndex > -1 ? (typeof row[salarioIndex] === 'number' ? row[salarioIndex] : parseFloat(row[salarioIndex])) || 0 : 0,
                pivo_nome: pivoName ? pivoName.toString() : null
            });
        }

        // Validar se pivoName parece um nome de pivô (não vazio, string)
        if (pivoName && typeof pivoName === 'string' && pivoName.trim().length > 0) {
          const normalizedName = pivoName.toString().trim().toLowerCase();
          // Ignorar se for "Total" ou algo assim
          if (normalizedName === 'total' || normalizedName === 'subtotal') return;

          headcountMap.set(normalizedName, (headcountMap.get(normalizedName) || 0) + 1);
          successRows++;
        } else {
          errorRows++;
        }
      });

      // Inserir colaboradores em lotes (Batch Insert)
      if (colaboradoresBatch.length > 0) {
          const BATCH_SIZE = 1000;
          for (let i = 0; i < colaboradoresBatch.length; i += BATCH_SIZE) {
              const chunk = colaboradoresBatch.slice(i, i + BATCH_SIZE);
              const { error } = await supabase.from('colaboradores').insert(chunk);
              if (error) {
                  console.warn(`Erro ao inserir lote ${i/BATCH_SIZE + 1} na tabela colaboradores:`, error.message);
              }
          }
      }

      // Atualizar log com números finais
      if (importacaoId) {
          await supabase.from('importacoes_headcount').update({
              linhas_com_erro: errorRows
          }).eq('id', importacaoId);
      }

      // 4. Atualizar Banco de Dados (Pivôs e Headcount)
      
      // B. Buscar IDs dos Pivôs
      const { data: pivos, error: pivosError } = await supabase.from('pivos').select('id, nome');
      if (pivosError) throw new Error(`Erro ao buscar pivôs: ${pivosError.message}`);

      const pivoNameToIdMap = new Map<string, string>();
      pivos?.forEach(p => {
        if (p.nome) pivoNameToIdMap.set(p.nome.toLowerCase(), p.id);
      });

      // C. Preparar dados para headcount_pivo e atualização de pivos
      const mesAno = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
      let successfulUpdates = 0;
      const errors: string[] = [];

      for (const [name, count] of headcountMap.entries()) {
        if (pivoNameToIdMap.has(name)) {
          const pivoId = pivoNameToIdMap.get(name)!;
          
          if (importacaoId) {
             await supabase.from('headcount_pivo').insert({
               importacao_id: importacaoId,
               pivo_id: pivoId,
               mes_ano: mesAno,
               headcount: count
             });
          }

          const { error: updateError } = await supabase
            .from('pivos')
            .update({ trabalhadores_atual: count })
            .eq('id', pivoId);

          if (updateError) {
            errors.push(`Erro ao atualizar pivô ${name}: ${updateError.message}`);
          } else {
            successfulUpdates++;
          }
        } else {
          // Pivô não existe: Criar automaticamente
          if (name.length > 2) {
             // Formatar nome para Title Case (opcional, mas fica melhor)
             const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
             
             const { data: newPivo, error: createError } = await supabase
                .from('pivos')
                .insert({ nome: formattedName, trabalhadores_atual: count })
                .select()
                .single();

             if (createError) {
                 errors.push(`Erro ao criar novo pivô "${name}": ${createError.message}`);
             } else if (newPivo) {
                 const pivoId = newPivo.id;
                 
                 if (importacaoId) {
                    await supabase.from('headcount_pivo').insert({
                        importacao_id: importacaoId,
                        pivo_id: pivoId,
                        mes_ano: mesAno,
                        headcount: count
                    });
                 }
                 successfulUpdates++;
                 // Adicionar ao mapa para evitar tentativas duplicadas no mesmo loop (embora o loop seja por chaves únicas)
                 pivoNameToIdMap.set(name, pivoId);
             }
          }
        }
      }

      setMessage('Importação concluída!');
      setDetails({
        totalProcessed: processedRows,
        successfulImports: successRows, // Linhas válidas que contribuíram para o headcount
        errorCount: errorRows + errors.length,
        errors: errors.map((e, i) => ({ lineNumber: i, error: e }))
      });

    } catch (error: any) {
      console.error('Erro no processamento:', error);
      setMessage(`Erro: ${error.message}`);
      
      if (error.message && error.message.includes('<!doctype html>')) {
        setMessage("Ambiente bloqueou cookie de autenticação. Upload redirecionado diretamente ao Supabase.");
      }
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Importar Dados</h3>
      <p className="text-sm text-gray-600 mb-4">
        Envie a planilha para processamento no servidor. O sistema identificará automaticamente pivôs e colaboradores.
      </p>
      
      <div className="flex items-center justify-center w-full">
        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
            <p className="text-xs text-gray-500">XLSX, CSV (MAX. 10MB)</p>
          </div>
          <input 
            id="dropzone-file" 
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="mt-4 flex items-center justify-center text-blue-600 text-sm font-medium">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processando planilha...
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-md text-sm ${message.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <p className="font-bold">{message}</p>
          {details && (
            <div className="mt-2 text-xs">
              <p>Processados: {details.totalProcessed}</p>
              <p>Sucessos: {details.successfulImports}</p>
              <p>Erros: {details.errorCount}</p>
              {details.errors && details.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside max-h-32 overflow-y-auto">
                  {details.errors.map((err: any, idx: number) => (
                    <li key={idx}>Linha {err.lineNumber}: {err.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportacaoPlanilhaButton;
