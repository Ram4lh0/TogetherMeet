import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Warning: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Add them to a .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
