import { NextResponse } from "next/server";

function extractSearchText(url: string) {
  try {
    const parsed = new URL(url);

    // Contoh: https://www.google.com/maps?q=Nama+Bisnis
    const q = parsed.searchParams.get("q");
    if (q) return q;

    // Contoh: /maps/place/Nama+Bisnis/...
    const match = parsed.pathname.match(/\/place\/([^/]+)/);

    if (match?.[1]) {
      return decodeURIComponent(match[1]).replace(/\+/g, " ");
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Google Maps resolver ready",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mapsUrl = body?.maps_url;

    if (!mapsUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "maps_url is required",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "GOOGLE_MAPS_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    // Follow short Google Maps links
    const redirectResponse = await fetch(mapsUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const finalUrl = redirectResponse.url || mapsUrl;

    const searchText = extractSearchText(finalUrl);

    if (!searchText) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not extract business name from Google Maps URL",
          final_url: finalUrl,
        },
        { status: 400 }
      );
    }

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery: searchText,
        }),
      }
    );

    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Google Places API error",
          details: googleData,
        },
        { status: googleResponse.status }
      );
    }

    const place = googleData?.places?.[0];

    if (!place?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Place not found",
          search_text: searchText,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      maps_url: mapsUrl,
      final_url: finalUrl,
      search_text: searchText,

      place_id: place.id,

      business_name: place.displayName?.text ?? null,

      formatted_address: place.formattedAddress ?? null,

      review_url: `https://search.google.com/local/writereview?placeid=${place.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Resolver failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
