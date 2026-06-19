import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Peringatan: SUPABASE_URL atau SUPABASE_KEY belum terkonfigurasi di file .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  db: {
    schema: 'inspirapos_v1', // Menggunakan schema inspirapos_v1 sesuai request user
  },
});
