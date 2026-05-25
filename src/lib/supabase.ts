import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co';
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export async function insertReserva(data: import('@/src/types').ReservaInsert) {
  const { error } = await supabase.from('reservas').insert([data]);
  if (error) throw error;
}

export async function insertLeadEvento(data: import('@/src/types').LeadEventoInsert) {
  const { error } = await supabase.from('leads_eventos').insert([data]);
  if (error) throw error;
}
