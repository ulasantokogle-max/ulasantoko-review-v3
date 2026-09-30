import { NextResponse } from "next/server";

function getMapsData(url: string) {
  try {
    const parsed = new URL(url);

    // Nama bisnis dari /maps/place/NAMA/
    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
    const name = placeMatch?.[1]
      ? decodeURIComponent(placeMatch[1]).replace(/\+/g, " ")
      : null;

    // Koordinat dari /@LAT,LNG
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    const latitude = coordMatch ? Number(coordMatch[1]) : null;
    const longitude = coordMatch ? Number(coordMatch[2]) : null;

    return {
      name,
      latitude,
      longitude,
    };
  } catch {
    return {
      name: null,
      latitude: null,
      longitude: null,
    };
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

    // Resolve short maps.app.goo.gl URL
    const redirectResponse = await fetch(mapsUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const finalUrl = redirectResponse.url || mapsUrl;

    const mapsData = getMapsData(finalUrl);

    if (!mapsData.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not extract business name from Google Maps URL",
          final_url: finalUrl,
        },
        { status: 400 }
      );
    }

    const requestBody: Record<string, unknown> = {
      textQuery: mapsData.name,
      maxResultCount: 5,
    };

    // Kalau URL Maps punya koordinat, jadikan location bias.
    if (
      mapsData.latitude !== null &&
      mapsData.longitude !== null
    ) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: mapsData.latitude,
            longitude: mapsData.longitude,
          },
          radius: 1000,
        },
      };
    }

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify(requestBody),
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

    const places = googleData?.places ?? [];

    if (!places.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Place not found",
          search_text: mapsData.name,
        },
        { status: 404 }
      );
    }

    /*
     * Bila Google Maps URL punya koordinat, Places API sudah
     * dipersempit ke area sekitar titik tersebut.
     */
    const place = places[0];

    return NextResponse.json({
      success: true,

      maps_url: mapsUrl,
      final_url: finalUrl,

      search_text: mapsData.name,

      source_location: {
        latitude: mapsData.latitude,
        longitude: mapsData.longitude,
      },

      place_id: place.id,

      business_name:
        place.displayName?.text ?? null,

      formatted_address:
        place.formattedAddress ?? null,

      location:
        place.location ?? null,

      review_url:
        `https://search.google.com/local/writereview?placeid=${place.id}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Resolver failed",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
