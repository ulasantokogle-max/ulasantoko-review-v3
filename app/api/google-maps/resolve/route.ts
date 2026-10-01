import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_MAPS_URL_LENGTH = 2048;
const MAX_REDIRECTS = 5;

function isAllowedGoogleMapsHost(hostname: string) {
  const host = hostname.toLowerCase();

  return (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "google.co.id" ||
    host.endsWith(".google.co.id")
  );
}

function parseAndValidateMapsUrl(input: string) {
  if (typeof input !== "string") {
    throw new Error("INVALID_MAPS_URL");
  }

  const value = input.trim();

  if (!value || value.length > MAX_MAPS_URL_LENGTH) {
    throw new Error("INVALID_MAPS_URL");
  }

  const parsed = new URL(value);

  if (parsed.protocol !== "https:") {
    throw new Error("HTTPS_REQUIRED");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL_CREDENTIALS_NOT_ALLOWED");
  }

  if (!isAllowedGoogleMapsHost(parsed.hostname)) {
    throw new Error("GOOGLE_MAPS_DOMAIN_REQUIRED");
  }

  return parsed;
}

async function resolveAllowedRedirects(initialUrl: URL) {
  let current = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        throw new Error("INVALID_REDIRECT");
      }

      const next = new URL(location, current);

      if (next.protocol !== "https:") {
        throw new Error("UNSAFE_REDIRECT_PROTOCOL");
      }

      if (next.username || next.password) {
        throw new Error("UNSAFE_REDIRECT_CREDENTIALS");
      }

      if (!isAllowedGoogleMapsHost(next.hostname)) {
        throw new Error("UNSAFE_REDIRECT_DOMAIN");
      }

      current = next;
      continue;
    }

    return current;
  }

  throw new Error("TOO_MANY_REDIRECTS");
}

function getMapsData(url: string) {
  try {
    const parsed = new URL(url);

    const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/]+)/);
    const name = placeMatch?.[1]
      ? decodeURIComponent(placeMatch[1]).replace(/\+/g, " ")
      : null;

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
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
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

    let validatedMapsUrl: URL;

    try {
      validatedMapsUrl = parseAndValidateMapsUrl(mapsUrl);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Invalid Google Maps URL",
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

    let finalUrl: URL;

    try {
      finalUrl = await resolveAllowedRedirects(validatedMapsUrl);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Google Maps redirect validation failed",
        },
        { status: 400 }
      );
    }

    const mapsData = getMapsData(finalUrl.toString());

    if (!mapsData.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not extract business name from Google Maps URL",
          final_url: finalUrl.toString(),
        },
        { status: 400 }
      );
    }

    const requestBody: Record<string, unknown> = {
      textQuery: mapsData.name,
      maxResultCount: 5,
    };

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
        cache: "no-store",
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

    const place = places[0];

    return NextResponse.json({
      success: true,
      maps_url: validatedMapsUrl.toString(),
      final_url: finalUrl.toString(),
      search_text: mapsData.name,
      source_location: {
        latitude: mapsData.latitude,
        longitude: mapsData.longitude,
      },
      place_id: place.id,
      business_name: place.displayName?.text ?? null,
      formatted_address: place.formattedAddress ?? null,
      location: place.location ?? null,
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
