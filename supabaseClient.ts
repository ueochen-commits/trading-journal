import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ohmsbapnwxjaroznkwxu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obXNiYXBud3hqYXJvem5rd3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTk5NTcsImV4cCI6MjA4NzkzNTk1N30.GTjSVcscYjdWVZ2oK_JNaOvHXKYY6EKOYz6UxPuKjMA";

export const supabase = createClient(supabaseUrl, supabaseKey);