const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: cols, error: cErr } = await supabase.from('colaboradores').select('id, nome, pivo_nome');
    const { data: pivos, error: pErr } = await supabase.from('pivos').select('id, nome');

    if (cErr) console.error('Cols error:', cErr);
    if (pErr) console.error('Pivos error:', pErr);

    if (!cols || !pivos) return;

    const N = cols.length;
    const P = pivos.length;

    // Shuffle
    const shuffledCols = [...cols].sort(() => Math.random() - 0.5);
    const shuffledPivots = [...pivos].sort(() => Math.random() - 0.5);

    const base = Math.floor(N / P);
    const remainder = N % P;

    const dist = shuffledPivots.map(p => ({ pivo_id: p.id, nome_do_pivo: p.nome, pessoas: [] }));

    let c = 0;
    for (let i = 0; i < dist.length; i++) {
        const q = base + (i < remainder ? 1 : 0);
        dist[i].pessoas = shuffledCols.slice(c, c + q).map(x => ({ id: x.id, nome: x.nome }));
        c += q;
    }

    fs.writeFileSync('C:/Users/eduardo.neiva/.gemini/antigravity/brain/bcb5fa87-684f-43f5-b2b0-c290628c109f/distribuicao_pivos.json', JSON.stringify(dist, null, 2));
    console.log('Saved to artifact JSON.');

    let updates = 0;
    // Sequential updates
    for (let i = 0; i < dist.length; i++) {
        const g = dist[i];
        for (const p of g.pessoas) {
            await supabase.from('colaboradores').update({ pivo_nome: g.nome_do_pivo }).eq('id', p.id);
            updates++;
        }
    }
    console.log('Banco atualizado com', updates, 'colaboradores.');
}
run();
