
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION: Add your Supabase credentials here
// ------------------------------------------------------------------
// You can enter them directly below or set them in your environment variables.
const supabaseUrl = process.env.SUPABASE_URL || 'https://emuiwkmvcgkmveisxsjm.supabase.co'; 
const supabaseAnonKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtdWl3a212Y2drbXZlaXN4c2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzYyMTcsImV4cCI6MjA4MzYxMjIxN30.yvGDpk_emlWsOse17eg0tY1suX1pP3ucJ9jGQEL4-pU'; 
// ------------------------------------------------------------------

if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.warn("Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY to connect to your backend.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
