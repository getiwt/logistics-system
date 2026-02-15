// lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY; // ←一応そのまま

  if (!url) throw new Error("supabaseUrl is required.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
