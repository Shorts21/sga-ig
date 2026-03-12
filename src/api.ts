import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import multer from 'multer';

// Criamos o Router para todas as rotas da API
const router = express.Router();

// ── CONFIGURAÇÕES DO SUPABASE ──
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY || '';

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ ATENÇÃO: Credenciais do Supabase ausentes.');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
};

// router.use de depuração robusto
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[API ${timestamp}]: ${req.method} ${req.originalUrl || req.url}`);
  next();
});

// Suporte a JSON em todas as rotas da API
router.use(express.json({ limit: '10mb' }));

router.get('/health', (req, res) => {
  const hasCreds = !!supabaseUrl && !!supabaseServiceKey;
  res.json({
    status: 'ok',
    message: 'API is running',
    supabaseConnected: hasCreds,
    env: process.env.NODE_ENV || 'development',
    version: '1.0.4'
  });
});

router.get('/culturas', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error } = await supabase.from('culturas').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error in /api/culturas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/pivos-geo', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error, count } = await supabase
      .from('pivos_geo')
      .select('*', { count: 'exact' })
      .range(0, 5000);
    if (error) throw error;
    console.log(`[API]: Fetched ${data?.length || 0} pivos_geo (Total: ${count})`);
    res.json({ data: data || [], count });
  } catch (error: any) {
    console.error('Error in /api/pivos-geo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/pivos-geo', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const raw = Array.isArray(req.body) ? req.body : [req.body];
    const { data, error } = await supabase.from('pivos_geo').upsert(raw, { onConflict: 'import_hash' }).select();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/pivots/:id', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabase
      .from('pivos')
      .update({ nome })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in PATCH /api/pivots/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/pivos-geo/:id', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { id } = req.params;
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabase
      .from('pivos_geo')
      .update({ nome })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in PATCH /api/pivos-geo/:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/pivots', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error, count } = await supabase.from('pivos').select('*', { count: 'exact' }).range(0, 5000);
    if (error) throw error;

    console.log(`[API]: Fetched ${data?.length || 0} pivots from 'pivos' table (Total: ${count})`);

    const mappedData = data.map((p: any) => {
      let position = null;
      if (p.position && p.position.coordinates) {
        position = p.position;
      } else if (p.latitude && p.longitude) {
        position = { type: 'Point', coordinates: [Number(p.longitude), Number(p.latitude)] };
      }
      return {
        pivo_id: String(p.id),
        pivo_nome: p.nome,
        position,
        area_ha: Number(p.area_hectares || p.area || 0),
        headcount: p.headcount || 0,
        trabalhadores_atual: p.trabalhadores_atual || 0,
        cultura_id: p.cultura_id
      };
    });
    res.json({ data: mappedData, count });
  } catch (error: any) {
    console.error('Error in /api/pivots:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/poligonais', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error } = await supabase.from('poligonais').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/configuracoes-legais', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error } = await supabase.from('configuracoes_legais').select('*').single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.json({ salario_minimo: 1621, inss_empresa_percentual: 20, fgts_percentual: 8, rat_percentual: 2, terceiros_percentual: 5.8, provisao_ferias_percentual: 11.11, provisao_13_percentual: 8.33 });
  }
});

router.get('/tipos-atividade', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error } = await supabase.from('tipos_atividade').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/colaboradores', async (req, res) => {
  const supabase = getSupabaseClient();
  if (!supabase) return res.status(500).json({ error: 'Supabase URL/Key missing on server' });
  try {
    const { data, error } = await supabase.from('colaboradores').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── EXPORTAÇÃO COMPATÍVEL ──
const app = express();
app.use(express.json({ limit: '10mb' }));

// Middleware para normalizar o path se vier do Netlify Functions
// O Netlify pode passar o path completo, incluindo o prefixo da função
app.use((req, res, next) => {
  // Se o path começar com /.netlify/functions/api/, removemos para o roteador poder casar
  const functionPrefix = '/.netlify/functions/api';
  if (req.url.startsWith(functionPrefix)) {
    req.url = req.url.slice(functionPrefix.length) || '/';
  }
  // Se o path começar com /api/, removemos para o roteador poder casar uniformemente
  const apiPrefix = '/api';
  if (req.url.startsWith(apiPrefix)) {
    req.url = req.url.slice(apiPrefix.length) || '/';
  }
  next();
});

// Agora montamos o router no root da aplicação interna do Express
// Como normalizamos o req.url acima, o router.get('/health') vai bater em qualquer uma!
app.use(router);

export { router as apiRouter };
export default app;


