import { createClient } from "@supabase/supabase-js";

export const GOOGLE_TEMPORARY_MESSAGE = "Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.";

// Imported only by server routes. Never attach a customer's bearer token here.
export async function reserveGoogleRequest() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SERVER_QUOTA_CONFIGURATION_REQUIRED");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc("v3_reserve_google_request");
    if (error || data?.success !== true) throw new Error("QUOTA_UNAVAILABLE");
  } catch {
    throw Object.assign(new Error(GOOGLE_TEMPORARY_MESSAGE), { status: 503, code: "GOOGLE_TEMPORARILY_UNAVAILABLE" });
  }
}
