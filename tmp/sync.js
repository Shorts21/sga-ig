const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: pivosGeo, error } = await supabase.from('pivos_geo').select('*');
    const { data: pivos, error: pivosErr } = await supabase.from('pivos').select('*');

    if (pivosErr) console.error(pivosErr);
    if (error) console.error(error);

    console.log('Columns in pivos:', pivos && pivos.length ? Object.keys(pivos[0]) : pivosErr);

    const existingNames = new Set(pivos ? pivos.map(p => p.nome) : []);
    const newPivos = [];

    if (pivosGeo) {
        for (const geo of pivosGeo) {
            if (!existingNames.has(geo.nome)) {
                newPivos.push({ nome: geo.nome, area_ha: geo.area_ha || 0 });
            }
        }

        if (newPivos.length > 0) {
            console.log('Inserting into pivos:', newPivos);
            const { data: inserted, error: insErr } = await supabase.from('pivos').insert(newPivos);
            if (insErr) { console.error('Error inserting:', insErr); }
            else { console.log('Successfully inserted.'); }
        } else {
            console.log('No new pivos to insert.');
        }
    }
}

run();
