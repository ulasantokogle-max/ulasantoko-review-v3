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

    const body = await request.json();

    const businessId = body?.business_id;
    const mapsUrl = body?.maps_url;
    const placeId = body?.place_id;

    if (!businessId || !mapsUrl || !placeId) {
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

    if (error) {
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
      { status: 500 }
    );
  }
}
