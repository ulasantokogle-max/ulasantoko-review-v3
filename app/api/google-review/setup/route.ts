import { ApiInputError, readApiJson } from "../../../../lib/apiInput";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveGoogleMapsUrl } from "../../../../lib/googleMapsResolver";
import { reserveGoogleRequest, GOOGLE_TEMPORARY_MESSAGE } from "../../../../lib/googleQuota";
import { hasGoogleBusinessAccess } from "../../../../lib/googleBusinessAccess";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Sesi login diperlukan." },
        { status: 401 }
      );
    }

    const body = await readApiJson(request);
    const businessId = body?.business_id;
    const mapsUrl = body?.maps_url;

    if (typeof businessId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId) || typeof mapsUrl !== "string" || !mapsUrl.trim() || mapsUrl.length > 2048) {
      return NextResponse.json(
        {
          success: false,
          message: "Data Google Review belum lengkap.",
        },
        { status: 400 }
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

    if (!await hasGoogleBusinessAccess(scopedClient, businessId)) {
      return NextResponse.json({ success: false, message: "Bisnis tidak tersedia untuk akun ini." }, { status: 403 });
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

    // Reuse the account-scoped saved profile when the Maps link is unchanged.
    const { data: saved, error: savedError } = await scopedClient
      .from("google_review_profiles")
      .select("maps_url,place_id,business_name")
      .eq("business_id", businessId).eq("status", "active").maybeSingle();
    if (savedError) {
      return NextResponse.json({ success: false, message: "Google Review belum dapat diperiksa. Silakan coba lagi." }, { status: 503 });
    }
    if (saved?.maps_url === mapsUrl.trim() && typeof saved.place_id === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(saved.place_id)) {
      const reviewUrl = `https://search.google.com/local/writereview?placeid=${saved.place_id}`;
      return NextResponse.json({ success: true, business_id: businessId, maps_url: saved.maps_url,
        place_id: saved.place_id, business_name: saved.business_name, formatted_address: null,
        review_url: reviewUrl, profile: { success: true, business_id: businessId, ...saved, review_url: reviewUrl } });
    }

    let resolved;
    try {
      resolved = await resolveGoogleMapsUrl(mapsUrl, reserveGoogleRequest);
    } catch (error) {
      const typed = error as Error & { status?: number; code?: string; details?: unknown };

      return NextResponse.json(
        {
          success: false,
          step: "resolve",
          code: typed.code,
          message: typed.code === "GOOGLE_TEMPORARILY_UNAVAILABLE" ? GOOGLE_TEMPORARY_MESSAGE : "Link Google Maps belum dapat diproses. Pastikan link benar lalu coba lagi.",
        },
        { status: typed.status ?? 400 }
      );
    }

    const { data: profile, error: saveError } = await scopedClient.rpc(
      "v3_set_google_review_profile",
      {
        p_business_id: businessId,
        p_maps_url: mapsUrl,
        p_place_id: resolved.place_id,
      }
    );

    if (saveError || !profile || profile.success === false) {
      return NextResponse.json(
        {
          success: false,
          step: "save",
          message: "Google Review belum dapat disimpan. Silakan coba lagi.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      business_id: businessId,
      maps_url: mapsUrl,
      place_id: resolved.place_id,
      business_name: resolved.business_name,
      formatted_address: resolved.formatted_address,
      review_url: resolved.review_url,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Google Review belum dapat diproses. Silakan coba lagi.",
      },
      { status: error instanceof ApiInputError ? error.status : 500 }
    );
  }
}
