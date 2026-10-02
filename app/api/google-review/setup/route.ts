import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveGoogleMapsUrl } from "../../../../lib/googleMapsResolver";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const businessId = body?.business_id;
    const mapsUrl = body?.maps_url;

    if (!businessId || !mapsUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "business_id and maps_url are required",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, message: "Supabase environment variables are missing" },
        { status: 500 }
      );
    }

    const token = authorization.slice("Bearer ".length).trim();
    const authClient = createClient(supabaseUrl, supabaseKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const scopedClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
    });

    const { data: limitData, error: limitError } = await scopedClient.rpc(
      "v3_check_google_maps_resolver_rate_limit"
    );

    if (limitError) {
      return NextResponse.json(
        { success: false, message: "Unable to verify request limit" },
        { status: 400 }
      );
    }

    if (limitData?.success === false) {
      return NextResponse.json(limitData, { status: 429 });
    }

    let resolved;
    try {
      resolved = await resolveGoogleMapsUrl(mapsUrl);
    } catch (error) {
      const typed = error as Error & { status?: number; details?: unknown };

      return NextResponse.json(
        {
          success: false,
          step: "resolve",
          message: typed.message || "Gagal memproses Google Maps URL.",
          details: typed.details,
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

    if (saveError) {
      return NextResponse.json(
        {
          success: false,
          step: "save",
          message: saveError.message,
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
        message: "Google Review setup failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
