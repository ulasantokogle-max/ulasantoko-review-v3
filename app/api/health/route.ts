import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const reply = (connected: boolean, publicCardOk: boolean) => NextResponse.json({
    success: connected,
    supabase_connected: connected,
    public_card_ok: publicCardOk,
    status: connected ? "ok" : "unavailable",
  }, { status: connected ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return reply(false, false);
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.rpc("v3_get_public_card", { p_card_code: "ULAS-00136" });
    // Connectivity is independent of whether this historical probe card still exists.
    const validCard = !error && !!data && typeof data === "object" && !Array.isArray(data)
      && data.ok !== false && data.success !== false;
    return reply(!error, validCard);
  } catch { return reply(false, false); }
}
