import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        success: false,
        supabase_connected: false,
        public_card_ok: false,
        error: "Supabase environment variables are missing",
      },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
