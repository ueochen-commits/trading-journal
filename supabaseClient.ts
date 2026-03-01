import { createClient } from '@supabase/supabase-js';

// TODO: REVERT TO ENV VARIABLES BEFORE DEPLOYING
// Paste your actual URL and Anon Key here
const supabaseUrl = "https://YOUR_ACTUAL_PROJECT_ID.supabase.co";
const supabaseKey = "YOUR_ACTUAL_LONG_ANON_KEY_HERE";

export const supabase = createClient(supabaseUrl, supabaseKey);