import { createClient } from '@supabase/supabase-js';

// URL do seu Supabase com fallback seguro para não quebrar o "next build"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://chvkpasvoibrhdqjsskt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("⚠️ Atenção: Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não encontradas nas definições da Vercel.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
