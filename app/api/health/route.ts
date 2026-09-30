import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const { error } = await supabase
    .from("businesses")
    .select("id")
    .limit(1);

  return NextResponse.json({
    success: !error,
    supabase_connected: !error,
    error: error?.message ?? null,
  });
}
