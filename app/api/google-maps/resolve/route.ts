import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
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

    const baseUrl = new URL(request.url).origin;

    // Step 1: resolve Google Maps URL
    const resolveResponse = await fetch(
      `${baseUrl}/api/google-maps/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maps_url: mapsUrl,
        }),
      }
    );

    const resolveData = await resolveResponse.json();

    if (!resolveResponse.ok || !resolveData?.success) {
      return NextResponse.json(
        {
          success: false,
          step: "resolve",
          details: resolveData,
        },
        { status: 400 }
      );
    }

    // Step 2: save to Supabase via protected profile route
    const saveResponse = await fetch(
      `${baseUrl}/api/google-review/profile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({
          business_id: businessId,
          maps_url: mapsUrl,
          place_id: resolveData.place_id,
        }),
      }
    );

    const saveData = await saveResponse.json();

    if (!saveResponse.ok || !saveData?.success) {
      return NextResponse.json(
        {
          success: false,
          step: "save",
          details: saveData,
        },
        { status: saveResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      business_id: businessId,
      maps_url: mapsUrl,
      place_id: resolveData.place_id,
      business_name: resolveData.business_name,
      formatted_address: resolveData.formatted_address,
      review_url: resolveData.review_url,
      profile: saveData.profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Google Review setup failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
