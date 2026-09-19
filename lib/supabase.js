import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://chvkpasvoibrhdqjsskt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodmtwYXN2b2licmhkcWpzc2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDA0MDM2MDAsImV4cCI6MjAxNjA1OTYwMH0.fallback_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
