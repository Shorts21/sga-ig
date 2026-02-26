import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import fetch from 'node-fetch';
import multer from 'multer';


async function createServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY!;



app.get('/api/schema', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('poligonais').select('*').limit(1);
    res.json({ data, error });
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.get('/api/pivots', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('pivos').select('*');
    if (error) throw error;
    
    const mappedData = data.map((p: any) => ({
      pivo_id: p.id,
      pivo_nome: p.nome,
      position: p.latitude && p.longitude ? { type: 'Point', coordinates: [p.longitude, p.latitude] } : null,
      area_ha: p.area_hectares || 0,
      headcount: 0,
      custo_total_calculado: 0,
      trabalhadores_min: 0,
      trabalhadores_ideal: 0,
      trabalhadores_max: 0,
      trabalhadores_atual: 0,
      custos_adicionais: 0
    }));
    
    res.json(mappedData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pivots.', details: error });
  }
});

app.get('/api/poligonais', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('poligonais').select('*');
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch poligonais.', details: error });
  }
});

// --- HR & FINANCIAL CONFIGURATIONS ---

app.get('/api/configuracoes-legais', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('configuracoes_legais').select('*').single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    
    if (!data) {
      // Return defaults if not found
      return res.json({
        salario_minimo: 1412,
        inss_empresa_percentual: 20,
        fgts_percentual: 8,
        rat_percentual: 2,
        terceiros_percentual: 5.8,
        provisao_ferias_percentual: 11.11,
        provisao_13_percentual: 8.33,
        adicionais_percentual: 0
      });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch legal settings.' });
  }
});

app.post('/api/configuracoes-legais', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('configuracoes_legais').upsert(req.body).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save legal settings.' });
  }
});

app.get('/api/tipos-atividade', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('tipos_atividade').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity types.' });
  }
});

app.post('/api/tipos-atividade', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('tipos_atividade').upsert(req.body).select();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save activity type.' });
  }
});

app.get('/api/colaboradores', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data, error } = await supabase.from('colaboradores').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collaborators.' });
  }
});

app.post('/api/colaboradores', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const colab = req.body;
    
    // Fetch legal settings for calculation
    const { data: legal } = await supabase.from('configuracoes_legais').select('*').single();
    const config = legal || {
      salario_minimo: 1412,
      inss_empresa_percentual: 20,
      fgts_percentual: 8,
      rat_percentual: 2,
      terceiros_percentual: 5.8,
      provisao_ferias_percentual: 11.11,
      provisao_13_percentual: 8.33,
      adicionais_percentual: 0
    };

    // Universal calculation rule with fallback
    const salarioBase = colab.salario_base ?? colab.salario ?? config.salario_minimo ?? 1412;
    const bonus = colab.bonus_fixo || 0;
    const horasExtras = colab.horas_extras_mensais || 0;
    
    const salarioReal = salarioBase + bonus + horasExtras;
    
    const encargosPercent = (config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual) / 100;
    const provisoesPercent = (config.provisao_ferias_percentual + config.provisao_13_percentual) / 100;
    const globalAdicionaisPercent = (config.adicionais_percentual || 0) / 100;
    
    const encargos = salarioReal * encargosPercent;
    const provisoes = salarioReal * provisoesPercent;
    
    // Custo = (Salário Real + Encargos + Provisões) * (1 + Adicionais Globais)
    colab.custo_empresa_calculado = (salarioReal + encargos + provisoes) * (1 + globalAdicionaisPercent);
    colab.salario_base = salarioBase; // Ensure fallback is saved if it was null

    const { data, error } = await supabase.from('colaboradores').upsert(colab).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save collaborator.' });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/sync-data', upload.single('file'), async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const startTime = Date.now();
  const fileBuffer = req.file.buffer;

  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json<any>(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Planilha XLSX vazia.' });
    }

    const firstRow = jsonData[0];
    const hasArea = 'Area' in firstRow || 'area' in firstRow || 'Area (ha)' in firstRow;
    
    let successfulImports = 0;
    const errorLines: { lineNumber: number, error: string }[] = [];

    if (hasArea) {
      // --- PIVOT MODE ---
      console.log('Processing Pivot List...');
      const pivosToUpsert = jsonData.map((row: any) => ({
        nome: row['Nome'] || row['nome'] || row['Pivo'] || `Pivô Importado ${Math.random().toString(36).substring(7)}`,
        area_hectares: parseFloat(row['Area'] || row['area'] || row['Area (ha)'] || 0),
        headcount: parseInt(row['Headcount'] || row['headcount'] || 0),
        custo_total_calculado: parseFloat(row['Custo'] || row['custo'] || row['Custo Total'] || 0),
        trabalhadores_min: parseInt(row['Min'] || row['min'] || 0),
        trabalhadores_ideal: parseInt(row['Ideal'] || row['ideal'] || 0),
        trabalhadores_max: parseInt(row['Max'] || row['max'] || 0),
        custos_adicionais: parseFloat(row['Adicionais'] || row['adicionais'] || 0),
      }));

      const { error } = await supabase.from('pivos').upsert(pivosToUpsert, { onConflict: 'nome' });
      if (error) throw error;
      successfulImports = pivosToUpsert.length;

    } else {
      // --- EMPLOYEE MODE ---
      console.log('Processing Employee List...');
      
      // 1. Register Import
      let importacaoId = null;
      const { data: impData, error: impError } = await supabase.rpc('registrar_importacao', {
        p_nome_arquivo: req.file.originalname,
        p_total_linhas: jsonData.length
      });

      if (impError) {
        console.warn('Could not register import via RPC, proceeding without ID:', impError.message);
      } else {
        importacaoId = impData;
      }

      // 2. Try to insert into 'colaboradores' table
      // Map columns to standard names
      const colaboradores = jsonData.map((row: any) => ({
        nome: row['Nome'] || row['nome'] || row['Colaborador'] || 'Desconhecido',
        cargo: row['Cargo'] || row['cargo'] || row['Função'] || null,
        salario: parseFloat(row['Salario'] || row['salario'] || row['Vencimentos'] || row['Custo'] || 0),
        pivo_nome: row['Pivo'] || row['pivo'] || row['Local'] || null,
        importacao_id: importacaoId
      }));

      // Try inserting into 'colaboradores' table
      const { error: colabError } = await supabase.from('colaboradores').insert(colaboradores);
      
      if (colabError) {
        console.warn('Table "colaboradores" insert failed. Falling back to headcount aggregation.', JSON.stringify(colabError));
        
        try {
          // Fallback: Aggregate by Pivot Name and insert into headcount_pivo (Legacy/Robust Mode)
          const headcountByPivo = new Map<string, number>();
          const pivoNameToIdMap = new Map<string, string>();

          // Fetch all pivots to map names to IDs
          const { data: pivos, error: pivosError } = await supabase.from('pivos').select('id, nome');
          if (pivosError) {
             console.error('Error fetching pivots for fallback:', JSON.stringify(pivosError));
             throw pivosError;
          }
          
          if (pivos) {
            pivos.forEach(p => {
              if (p.nome) pivoNameToIdMap.set(p.nome.toLowerCase(), p.id);
            });
          }

          jsonData.forEach((row: any) => {
            const pivoName = (row['Pivo'] || row['pivo'] || row['Local'] || '').toString().trim().toLowerCase();
            if (pivoName && pivoNameToIdMap.has(pivoName)) {
              const pivoId = pivoNameToIdMap.get(pivoName)!;
              headcountByPivo.set(pivoId, (headcountByPivo.get(pivoId) || 0) + 1);
            }
          });

          const mesAno = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
          const headcountToInsert = Array.from(headcountByPivo.entries()).map(([pivoId, count]) => ({
            importacao_id: importacaoId,
            pivo_id: pivoId,
            mes_ano: mesAno,
            headcount: count
          }));

          if (headcountToInsert.length > 0) {
            // Try to insert into headcount_pivo, but don't block if it fails (e.g. missing import_id)
            try {
               const { error: hcError } = await supabase.from('headcount_pivo').insert(headcountToInsert);
               if (hcError) console.warn('Failed to insert into headcount_pivo:', hcError.message);
            } catch (e) {
               console.warn('Exception inserting into headcount_pivo:', e);
            }

            successfulImports = headcountToInsert.length;

            // Update pivos table with new headcount (Critical step)
            for (const item of headcountToInsert) {
               const { error: updateError } = await supabase.from('pivos').update({ trabalhadores_atual: item.headcount }).eq('id', item.pivo_id);
               if (updateError) console.warn(`Failed to update pivot ${item.pivo_id}:`, updateError.message);
            }
          } else {
             console.warn('No matching pivots found for headcount aggregation.');
          }
        } catch (fallbackError: any) {
          console.error('Fallback aggregation failed:', fallbackError);
          throw new Error(`Fallback failed: ${fallbackError.message}`);
        }
        
      } else {
        successfulImports = colaboradores.length;
        // ... (rest of the success logic)
        
        // Also update headcount in pivos based on this data
        // Group by pivo_nome
        const headcountMap = new Map<string, number>();
        const costMap = new Map<string, number>();

        colaboradores.forEach((c: any) => {
          if (c.pivo_nome) {
            const key = c.pivo_nome.toLowerCase();
            headcountMap.set(key, (headcountMap.get(key) || 0) + 1);
            costMap.set(key, (costMap.get(key) || 0) + c.salario);
          }
        });

        // Fetch existing pivos to match IDs
        const { data: existingPivos } = await supabase.from('pivos').select('id, nome');
        if (existingPivos) {
          for (const p of existingPivos) {
            const key = p.nome.toLowerCase();
            if (headcountMap.has(key)) {
              await supabase.from('pivos').update({
                trabalhadores_atual: headcountMap.get(key),
                custo_total_calculado: costMap.get(key) // Optional: update cost too
              }).eq('id', p.id);
            }
          }
        }
      }
    }

    const endTime = Date.now();
    res.status(200).json({
      message: 'Importação concluída com sucesso.',
      totalProcessed: jsonData.length,
      successfulImports: successfulImports,
      errorCount: errorLines.length,
      errors: errorLines,
      processingTime: `${((endTime - startTime) / 1000).toFixed(2)} segundos`
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Falha na importação.', details: error.message });
  }
});

app.post('/api/seed-pivos', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const samplePivos = [
    {
      nome: 'Pivô 01 - Milho',
      area_hectares: 120.5,
      longitude: -41.410589,
      latitude: -13.306444
    },
    {
      nome: 'Pivô 02 - Soja',
      area_hectares: 95.0,
      longitude: -41.420589,
      latitude: -13.316444
    },
    {
      nome: 'Pivô 03 - Algodão',
      area_hectares: 150.0,
      longitude: -41.400589,
      latitude: -13.296444
    }
  ];

  try {
    const { data, error } = await supabase.from('pivos').upsert(samplePivos, { onConflict: 'nome' });
    if (error) throw error;
    res.json({ message: 'Sample pivots seeded successfully', data });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to seed pivots', details: error.message });
  }
});

app.post('/api/seed-database', async (req, res) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Seed Poligonais
    const poligonais = [
      { nome: 'Fazenda Norte', area_hectares: 1500, geometry: { type: 'Polygon', coordinates: [[[-41.5, -13.25], [-41.3, -13.25], [-41.3, -13.4], [-41.5, -13.4], [-41.5, -13.25]]] } },
      { nome: 'Fazenda Sul', area_hectares: 2200, geometry: { type: 'Polygon', coordinates: [[[-41.5, -13.45], [-41.3, -13.45], [-41.3, -13.6], [-41.5, -13.6], [-41.5, -13.45]]] } },
    ];
    const { error: poligonaisError } = await supabase.from('poligonais').upsert(poligonais, { onConflict: 'nome' });
    if (poligonaisError) throw new Error(`Seeding poligonais failed: ${poligonaisError.message}`);

    // 2. Seed Pivots within those poligonais
    const pivos = [
      { nome: 'Pivô N-01', area_hectares: 120.5, longitude: -41.41, latitude: -13.30 },
      { nome: 'Pivô N-02', area_hectares: 95.0, longitude: -41.42, latitude: -13.31 },
      { nome: 'Pivô N-03', area_hectares: 150.0, longitude: -41.40, latitude: -13.29 },
      { nome: 'Pivô S-01', area_hectares: 210.0, longitude: -41.45, latitude: -13.50 },
      { nome: 'Pivô S-02', area_hectares: 180.0, longitude: -41.46, latitude: -13.52 },
    ];
    const { data: pivotData, error: pivosError } = await supabase.from('pivos').upsert(pivos, { onConflict: 'nome' }).select();
    if (pivosError) throw new Error(`Seeding pivos failed: ${pivosError.message}`);
    if (!pivotData) throw new Error('No pivots returned after seeding.');

    // 3. Generate and distribute collaborators
    const cargos = ['Operador de Máquinas', 'Irrigador', 'Técnico Agrícola', 'Supervisor'];
    const salarios = { 'Operador de Máquinas': 2800, 'Irrigador': 2200, 'Técnico Agrícola': 3500, 'Supervisor': 4500 };
    
    // Fetch legal settings for seed calculation
    const { data: legal } = await supabase.from('configuracoes_legais').select('*').single();
    const config = legal || {
      salario_minimo: 1412,
      inss_empresa_percentual: 20,
      fgts_percentual: 8,
      rat_percentual: 2,
      terceiros_percentual: 5.8,
      provisao_ferias_percentual: 11.11,
      provisao_13_percentual: 8.33,
      adicionais_percentual: 0
    };
    const totalEncargos = (config.inss_empresa_percentual + config.fgts_percentual + config.rat_percentual + config.terceiros_percentual + config.provisao_ferias_percentual + config.provisao_13_percentual) / 100;
    const globalAdicionais = (config.adicionais_percentual || 0) / 100;

    const colaboradores = [];
    for (let i = 0; i < 50; i++) {
      const cargo = cargos[i % cargos.length];
      const pivo = pivotData[i % pivotData.length];
      const salarioBase = salarios[cargo] + Math.random() * 500;
      const bonus = Math.random() > 0.8 ? 200 : 0;
      const custoCalculado = (salarioBase + bonus) * (1 + totalEncargos) * (1 + globalAdicionais);

      colaboradores.push({
        nome: `Colaborador ${i + 1}`,
        cargo: cargo,
        salario: salarioBase, // legacy field
        salario_base: salarioBase,
        bonus_fixo: bonus,
        horas_extras_mensais: 0,
        pivo_id: pivo.id,
        pivo_nome: pivo.nome,
        custo_empresa_calculado: custoCalculado
      });
    }
    
    // Ensure colaboradores table exists (simple version)
    // A proper migration would be better, but for seeding this is okay.
    // This will fail if table exists but with different columns. We assume it's either non-existent or correct.
    // Let's create a dedicated SQL script for this.

    // Clear existing collaborators to avoid duplicates on re-seed
    const { error: deleteError } = await supabase.from('colaboradores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) console.warn(`Could not clear collaborators, may be first run: ${deleteError.message}`);

    const { error: colabError } = await supabase.from('colaboradores').insert(colaboradores);
    if (colabError) throw new Error(`Inserting collaborators failed: ${colabError.message}`);

    res.json({ message: 'Database seeded successfully!' });

  } catch (error: any) {
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});


app.post('/api/poligonais-pivos', async (req, res) => {
  const { poligonais } = req.body;

  if (!poligonais || !Array.isArray(poligonais)) {
    return res.status(400).json({ error: 'Invalid input. "poligonais" array is required.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    for (const poligonalData of poligonais) {
      // Insert Poligonal
      const { data: newPoligonal, error: poligonalError } = await supabase
        .from('poligonais')
        .insert({
          nome: poligonalData.nome,
          geometry: { type: 'Polygon', coordinates: [poligonalData.poligono] },
        })
        .select()
        .single();

      if (poligonalError) throw new Error(`Error creating poligonal ${poligonalData.nome}: ${poligonalError.message}`);

      // Insert Pivo
      const pivoData = poligonalData.pivo;
      const { error: pivoError } = await supabase.from('pivos').insert({
        nome: pivoData.nome,
        latitude: pivoData.latitude,
        longitude: pivoData.longitude,
        area_hectares: 0,
        poligonal_id: newPoligonal.id
      });

      if (pivoError) throw new Error(`Error creating pivo ${pivoData.nome}: ${pivoError.message}`);
    }

    res.status(201).json({ message: 'Poligonais and pivots created successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process request', details: error.message });
  }
});

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}

createServer();
