
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPivos() {
  const { data, error } = await supabase
    .from('pivos')
    .select('*');

  if (error) {
    console.error('Error fetching pivos:', error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

fetchPivos();
