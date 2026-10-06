import { ApiInputError, readApiJson } from "../../../../lib/apiInput";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveGoogleMapsUrl } from "../../../../lib/googleMapsResolver";
import { reserveGoogleRequest, GOOGLE_TEMPORARY_MESSAGE } from "../../../../lib/googleQuota";
import { hasGoogleBusinessAccess } from "../../../../lib/googleBusinessAccess";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Google Maps resolver ready",
  });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Sesi login diperlukan." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, message: "Layanan sedang mengalami kendala." },
        { status: 500 }
      );
    }

    const token = authorization.slice("Bearer ".length).trim();
    const authClient = createClient(supabaseUrl, supabaseKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, message: "Sesi login sudah berakhir." },
        { status: 401 }
      );
    }

    const scopedClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
    });

    if (!await hasGoogleBusinessAccess(scopedClient)) {
      return NextResponse.json({ success: false, message: "Aktifkan kartu dan bisnis terlebih dahulu." }, { status: 403 });
    }

    const { data: limitData, error: limitError } = await scopedClient.rpc(
      "v3_check_google_maps_resolver_rate_limit"
    );

    if (limitError) {
      return NextResponse.json(
        { success: false, message: "Permintaan belum dapat diproses. Silakan coba lagi." },
        { status: 400 }
      );
    }

    if (limitData?.success !== true) {
      return NextResponse.json(
        { success: false, message: "Permintaan belum dapat diproses. Silakan coba lagi nanti." },
        { status: limitData?.success === false ? 429 : 503 }
      );
    }

    const body = await readApiJson(request);
    const mapsUrl = body?.maps_url;

    if (typeof mapsUrl !== "string" || !mapsUrl.trim() || mapsUrl.length > 2048) {
      return NextResponse.json(
        { success: false, message: "Link Google Maps wajib diisi." },
        { status: 400 }
      );
    }

    try {
      const data = await resolveGoogleMapsUrl(mapsUrl, reserveGoogleRequest);
      return NextResponse.json({ success: true, ...data });
    } catch (error) {
      const typed = error as Error & { status?: number; code?: string; details?: unknown };

      return NextResponse.json(
        {
          success: false,
          code: typed.code,
          message: typed.code === "GOOGLE_TEMPORARILY_UNAVAILABLE" ? GOOGLE_TEMPORARY_MESSAGE : "Link Google Maps belum dapat diproses. Pastikan link benar lalu coba lagi.",
        },
        { status: typed.status ?? 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Link Google Maps belum dapat diproses. Silakan coba lagi.",
      },
      { status: error instanceof ApiInputError ? error.status : 500 }
    );
  }
}
