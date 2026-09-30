import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabase.rpc("v3_get_public_card", {
    p_card_code: "ULAS-00136",
  });

  return NextResponse.json({
    success: !error,
    supabase_connected: !error,
    public_card_ok: !!data,
    error: error?.message ?? null,
  });
}
