const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY);
async function run() {
    const { data: cols } = await supabase.from('colaboradores').select('id, nome');
    const { data: pivos } = await supabase.from('pivos').select('id, nome');
    console.log(`Colaboradores: ${cols?.length}, Pivôs: ${pivos?.length}`);
}
run();
