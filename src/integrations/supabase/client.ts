import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Só a URL e a chave publicável ficam no cliente (são públicas por definição; quem protege os dados é o RLS).
 * Nenhuma chave do Google ou de IA aqui: elas ficam em secrets das Edge Functions.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://fikbetwjamzkphgnoxol.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_068eanwqkx2AfR_c1j09ig_HfLup84O";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
