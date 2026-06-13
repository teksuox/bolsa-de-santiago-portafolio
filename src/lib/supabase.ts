import { createClient } from '@supabase/supabase-js';
import { DBBackupData } from '../db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not set. Cloud sync will not work.\n' +
    'Create a .env file with:\n' +
    '  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=tu-anon-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadPortfolioToSupabase(data: DBBackupData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión para sincronizar.');

  const { error } = await supabase.from('portafolios').upsert(
    { user_id: user.id, data },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

export async function downloadPortfolioFromSupabase(): Promise<DBBackupData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Debes iniciar sesión para sincronizar.');

  const { data, error } = await supabase
    .from('portafolios')
    .select('data')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.data as DBBackupData | null;
}
