import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const usersToCreate = [
        { email: 'admin@sga-ig.com', password: 'iga@2026@', emailConfirm: true },
        { email: 'paloma.pires@sga-ig.com', password: '@Iga@2026', emailConfirm: true }
    ];

    for (const user of usersToCreate) {
        // Check if user already exists based on our previous logic using supabase.auth.signUp or admin
        // using admin side
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { role: 'admin' }
        });

        if (error) {
            if (error.message.includes('already exists') || error.message.includes('User already registered')) {
                console.log(`User ${user.email} already exists.`);
            } else {
                console.error(`Error creating ${user.email}:`, error);
            }
        } else {
            console.log(`Created user ${user.email} successfully.`);
        }
    }
}

run();
