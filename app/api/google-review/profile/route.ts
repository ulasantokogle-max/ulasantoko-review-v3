import { ApiInputError, readApiJson } from "../../../../lib/apiInput";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi login diperlukan.",
        },
        { status: 401 }
      );
    }

    const body = await readApiJson(request);

    const businessId = body?.business_id;
    const mapsUrl = body?.maps_url;
    const placeId = body?.place_id;

    if (typeof businessId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId) || typeof mapsUrl !== "string" || !/^https:\/\//i.test(mapsUrl) || mapsUrl.length > 2048 || typeof placeId !== "string" || !placeId.trim() || placeId.length > 256) {
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
        {
          success: false,
          message: "Layanan sedang mengalami kendala.",
        },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseKey);
    const { data: userData, error: authError } = await authClient.auth.getUser(
      authorization.slice("Bearer ".length).trim()
    );
    if (authError || !userData.user) {
      return NextResponse.json({ success: false, message: "Sesi login sudah berakhir." }, { status: 401 });
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    const { data, error } = await supabase.rpc(
      "v3_set_google_review_profile",
      {
        p_business_id: businessId,
        p_maps_url: mapsUrl,
        p_place_id: placeId,
      }
    );

    if (error || !data || data.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: "Profil Google Review belum dapat disimpan. Silakan coba lagi.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Profil Google Review belum dapat disimpan. Silakan coba lagi.",
      },
      { status: error instanceof ApiInputError ? error.status : 500 }
    );
  }
}
