import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export interface ProcessResult {
  success: boolean;
  inserted_poligonais: number;
  inserted_pivos: number;
  inserted_colaboradores: number;
  errors: string[];
}

/**
 * Normaliza uma string para comparação de cabeçalhos
 */
function normalize(str: string) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Lê o arquivo XLSX, escolhe a aba com mais dados e detecta a linha do cabeçalho automaticamente
 */
export async function parseSpreadsheet(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  
  console.log("ABAS ENCONTRADAS:", workbook.SheetNames);

  let bestSheetName = "";
  let bestHeaderIndex = 0;
  let maxDataRows = -1;
  const headerKeywords = ["poligonal", "fazenda", "pivo", "lat", "long", "lng", "colaborador", "nome", "area", "identificador"];

  // Percorre todas as abas para encontrar a que tem mais dados úteis
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    
    if (rawData.length === 0) continue;

    // Procura o cabeçalho nas primeiras 20 linhas desta aba
    let sheetMaxMatches = -1;
    let sheetHeaderIndex = 0;

    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i];
      let matches = 0;
      row.forEach(cell => {
        const normCell = normalize(String(cell));
        if (normCell && headerKeywords.some(kw => normCell.includes(kw))) {
          matches++;
        }
      });

      if (matches > sheetMaxMatches) {
        sheetMaxMatches = matches;
        sheetHeaderIndex = i;
      }
      if (matches >= 3) break; // Encontrou um cabeçalho sólido
    }

    const dataRowsCount = rawData.length - sheetHeaderIndex - 1;
    console.log(`Aba: ${name} | Cabeçalho na linha: ${sheetHeaderIndex + 1} | Linhas de dados: ${dataRowsCount}`);

    if (dataRowsCount > maxDataRows) {
      maxDataRows = dataRowsCount;
      bestSheetName = name;
      bestHeaderIndex = sheetHeaderIndex;
    }
  }

  if (!bestSheetName || maxDataRows <= 0) {
    throw new Error("Nenhuma aba com dados estruturados foi encontrada na planilha");
  }

  console.log("ABA ESCOLHIDA:", bestSheetName);
  console.log("TOTAL LINHAS DE DADOS:", maxDataRows);

  const finalRows = XLSX.utils.sheet_to_json(workbook.Sheets[bestSheetName], { 
    range: bestHeaderIndex, 
    defval: "" 
  });

  return finalRows;
}

/**
 * REESCRITA COMPLETA: Mapeia as linhas brutas para entidades estruturadas agregando dados
 */
export function mapRowsToEntities(rows: any[]) {
  const mapaPoligonais = new Map<string, { nome: string; coordinates: [number, number][] }>();
  const mapaPivos = new Map<string, { nome: string; area_hectares: number; latitude: number; longitude: number; poligonal_nome: string }>();
  const mapaColaboradores = new Map<string, { nome: string; cargo: string; salario: number; pivo_nome: string | null }>();

  if (rows.length === 0) return { poligonais: [], pivos: [], colaboradores: [] };

  const headers = Object.keys(rows[0] || {});
  console.log("HEADERS DETECTADOS:", headers);
  
  // Mapeamento dinâmico de colunas (Aliases ultra-expandidos)
  const colPoligonal = headers.find(h => ["poligonal", "area", "talhao", "nome", "fazenda", "gleba", "nomepoligonal", "identificacao"].includes(normalize(h)));
  const colLat = headers.find(h => ["lat", "latitude", "y", "coordy", "norte", "latitudo", "posicaoy"].includes(normalize(h)));
  const colLng = headers.find(h => ["lng", "long", "longitude", "x", "coordx", "leste", "longitudo", "posicaox"].includes(normalize(h)));
  const colPivo = headers.find(h => ["pivo", "pivot", "equipamento", "nomepivo", "identificador", "pivocentral"].includes(normalize(h)));
  const colColaborador = headers.find(h => ["colaborador", "funcionario", "nomecolaborador", "nome", "operador", "trabalhador", "pessoa"].includes(normalize(h)));
  const colAreaPivo = headers.find(h => ["areapivo", "areaha", "areahectares", "tamanho", "ha", "superficie"].includes(normalize(h)));
  const colSalario = headers.find(h => ["salario", "vencimentos", "valor", "custo", "remuneracao", "rendimento"].includes(normalize(h)));
  const colCargo = headers.find(h => ["cargo", "funcao", "atividade", "ocupacao", "posicao"].includes(normalize(h)));

  console.log("COLUNAS MAPEADAS:", { colPoligonal, colLat, colLng, colPivo, colColaborador });

  rows.forEach((row) => {
    const nomePoligonal = colPoligonal ? String(row[colPoligonal]).trim() : "";
    const latRaw = colLat ? row[colLat] : "";
    const lngRaw = colLng ? row[colLng] : "";
    
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === "" || val === " ") return NaN;
      const cleaned = String(val).replace(',', '.').replace(/[^-0.9.]/g, '');
      return Number(cleaned);
    };

    const latitude = parseNum(latRaw);
    const longitude = parseNum(lngRaw);

    // 1. Agregação de Poligonais
    if (nomePoligonal && !isNaN(latitude) && !isNaN(longitude)) {
      if (!mapaPoligonais.has(nomePoligonal)) {
        mapaPoligonais.set(nomePoligonal, { nome: nomePoligonal, coordinates: [] });
      }
      mapaPoligonais.get(nomePoligonal)!.coordinates.push([longitude, latitude]);
    }

    // 2. Pivôs Únicos
    const pivoVal = colPivo ? String(row[colPivo]).trim() : "";
    const nomePivo = pivoVal || (nomePoligonal ? `Pivo ${nomePoligonal}` : "");
    if (nomePivo && !isNaN(latitude) && !isNaN(longitude)) {
      if (!mapaPivos.has(nomePivo)) {
        const area = colAreaPivo ? parseNum(row[colAreaPivo]) : 0;
        mapaPivos.set(nomePivo, {
          nome: nomePivo,
          area_hectares: isNaN(area) ? 0 : area,
          latitude: latitude,
          longitude: longitude,
          poligonal_nome: nomePoligonal
        });
      }
    }

    // 3. Colaboradores Únicos
    const nomeColab = colColaborador ? String(row[colColaborador]).trim() : "";
    // Evita usar o nome da poligonal como nome do colaborador
    if (nomeColab && nomeColab !== "" && nomeColab !== nomePoligonal) {
      if (!mapaColaboradores.has(nomeColab)) {
        const salario = colSalario ? parseNum(row[colSalario]) : 0;
        mapaColaboradores.set(nomeColab, {
          nome: nomeColab,
          cargo: (colCargo ? String(row[colCargo]).trim() : "") || "Operacional",
          salario: isNaN(salario) ? 0 : salario,
          pivo_nome: nomePivo || null
        });
      }
    }
  });

  // Recalcular centros dos pivôs baseados nas poligonais
  for (const [nome, poligonal] of mapaPoligonais.entries()) {
    if (poligonal.coordinates.length > 0) {
      const center = poligonal.coordinates.reduce((acc, cur) => [acc[0] + cur[0], acc[1] + cur[1]], [0, 0]);
      center[0] /= poligonal.coordinates.length;
      center[1] /= poligonal.coordinates.length;
      
      const pivo = mapaPivos.get(nome) || Array.from(mapaPivos.values()).find(p => p.poligonal_nome === nome);
      if (pivo) {
        pivo.longitude = center[0];
        pivo.latitude = center[1];
      }
    }
  }

  const poligonais = Array.from(mapaPoligonais.values()).map(p => ({
    nome: p.nome,
    geometry: { type: 'Polygon', coordinates: [p.coordinates] }
  }));

  if (poligonais.length === 0) {
    throw new Error("Parser não conseguiu estruturar poligonais. Verifique se as colunas de Nome e Coordenadas estão corretas.");
  }

  const pivos = Array.from(mapaPivos.values());
  const colaboradores = Array.from(mapaColaboradores.values());

  console.log("POLIGONAIS CRIADAS:", poligonais.length);
  console.log("PIVOS UNICOS:", pivos.length);
  console.log("COLABORADORES UNICOS:", colaboradores.length);

  return { poligonais, pivos, colaboradores };
}

/**
 * Upsert Poligonais no Supabase
 */
async function upsertPoligonais(data: any[]): Promise<{ count: number; errors: string[] }> {
  if (data.length === 0) return { count: 0, errors: [] };
  
  const poligonaisToUpsert = data.map(p => {
    const payload: any = {
      nome: p.nome,
      geometry: p.geometry
    };
    // Remove undefined/null
    Object.keys(payload).forEach(key => (payload[key] == null) && delete payload[key]);
    return payload;
  });

  console.log("Payload enviado (poligonais):", poligonaisToUpsert);

  const { error } = await supabase.from('poligonais').upsert(poligonaisToUpsert, { onConflict: 'nome' });
  
  if (error) {
    console.error('Erro ao upsert poligonais:', error);
    return { count: 0, errors: [error.message] };
  }
  return { count: data.length, errors: [] };
}

/**
 * Upsert Pivos no Supabase
 */
async function upsertPivos(data: any[]): Promise<{ count: number; errors: string[]; pivoNameToId: Map<string, string> }> {
  if (data.length === 0) return { count: 0, errors: [], pivoNameToId: new Map() };

  const pivoNameToId = new Map<string, string>();
  
  // Busca IDs de poligonais para vincular
  const { data: poligonais } = await supabase.from('poligonais').select('id, nome');
  const poligonalNameToId = new Map(poligonais?.map(p => [p.nome, p.id]));

  const pivosToUpsert = data.map(p => {
    const payload: any = {
      nome: p.nome,
      area_hectares: p.area_hectares,
      latitude: p.latitude,
      longitude: p.longitude,
      poligonal_id: poligonalNameToId.get(p.poligonal_nome) || null
    };
    // Remove undefined/null
    Object.keys(payload).forEach(key => (payload[key] == null) && delete payload[key]);
    return payload;
  });

  console.log("Payload enviado (pivos):", pivosToUpsert);

  const { data: inserted, error } = await supabase.from('pivos').upsert(pivosToUpsert, { onConflict: 'nome' }).select('id, nome');
  
  if (error) {
    console.error('Erro ao upsert pivos:', error);
    return { count: 0, errors: [error.message], pivoNameToId };
  }

  inserted?.forEach(p => pivoNameToId.set(p.nome, p.id));
  return { count: inserted?.length || 0, errors: [], pivoNameToId };
}

/**
 * Upsert Colaboradores no Supabase
 */
async function upsertColaboradores(data: any[], pivoNameToId: Map<string, string>): Promise<{ count: number; errors: string[] }> {
  if (data.length === 0) return { count: 0, errors: [] };

  const colaboradoresToUpsert = data.map(c => {
    const payload: any = {
      nome: c.nome,
      cargo: c.cargo,
      salario: c.salario,
      pivo_id: pivoNameToId.get(c.pivo_nome || "") || null
    };
    // Remove undefined/null
    Object.keys(payload).forEach(key => (payload[key] == null) && delete payload[key]);
    return payload;
  });

  console.log("Payload enviado (colaboradores):", colaboradoresToUpsert);

  const { error } = await supabase.from('colaboradores').upsert(colaboradoresToUpsert, { onConflict: 'nome' });
  
  if (error) {
    console.error('Erro ao upsert colaboradores:', error);
    return { count: 0, errors: [error.message] };
  }
  return { count: data.length, errors: [] };
}

/**
 * Função principal para processar a planilha e inserir no Supabase
 */
export async function processSpreadsheetAndInsertSupabase(file: File): Promise<ProcessResult> {
  const result: ProcessResult = {
    success: false,
    inserted_poligonais: 0,
    inserted_pivos: 0,
    inserted_colaboradores: 0,
    errors: []
  };

  try {
    console.log('Iniciando processamento da planilha...');
    const rows = await parseSpreadsheet(file);

    const entities = mapRowsToEntities(rows);

    // 1. Poligonais
    const polRes = await upsertPoligonais(entities.poligonais);
    result.inserted_poligonais = polRes.count;
    result.errors.push(...polRes.errors);

    // 2. Pivos
    const pivoRes = await upsertPivos(entities.pivos);
    result.inserted_pivos = pivoRes.count;
    result.errors.push(...pivoRes.errors);

    // 3. Colaboradores
    const colRes = await upsertColaboradores(entities.colaboradores, pivoRes.pivoNameToId);
    result.inserted_colaboradores = colRes.count;
    result.errors.push(...colRes.errors);

    result.success = result.errors.length === 0;
    console.log('Processamento concluído:', result);
    return result;

  } catch (err: any) {
    console.error('Erro fatal no processamento:', err);
    result.errors.push(err.message || 'Erro desconhecido');
    return result;
  }
}
