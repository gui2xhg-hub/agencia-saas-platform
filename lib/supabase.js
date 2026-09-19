import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://chvkpasvoibrhdqjsskt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodmtwYXN2b2licmhkcWpzc2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0OTA3NTAsImV4cCI6MjEwNDA2Njc1MH0.G2jT-XW-Zeoar9iZXcQTNC8EZuQJTlO0vMVJbSRvX8Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
