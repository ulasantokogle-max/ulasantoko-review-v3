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

  if (parsed.port && parsed.port !== "443") throw new Error("UNSAFE_PORT");

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
      signal: AbortSignal.timeout(8000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) throw new Error("INVALID_REDIRECT");

      const next = new URL(location, current);

      if (next.port && next.port !== "443") throw new Error("UNSAFE_REDIRECT_PORT");
      if (next.protocol !== "https:") throw new Error("UNSAFE_REDIRECT_PROTOCOL");
      if (next.username || next.password) throw new Error("UNSAFE_REDIRECT_CREDENTIALS");
      if (!isAllowedGoogleMapsHost(next.hostname)) throw new Error("UNSAFE_REDIRECT_DOMAIN");

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

    return {
      name,
      latitude: coordMatch ? Number(coordMatch[1]) : null,
      longitude: coordMatch ? Number(coordMatch[2]) : null,
    };
  } catch {
    return { name: null, latitude: null, longitude: null };
  }
}

export async function resolveGoogleMapsUrl(mapsUrl: string) {
  const validatedMapsUrl = parseAndValidateMapsUrl(mapsUrl);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");

  const finalUrl = await resolveAllowedRedirects(validatedMapsUrl);
  const mapsData = getMapsData(finalUrl.toString());

  if (!mapsData.name) {
    throw new Error("Could not extract business name from Google Maps URL");
  }

  const requestBody: Record<string, unknown> = {
    textQuery: mapsData.name,
    maxResultCount: 5,
  };

  if (mapsData.latitude !== null && mapsData.longitude !== null) {
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
      signal: AbortSignal.timeout(8000),
    }
  );

  const googleData = await googleResponse.json();

  if (!googleResponse.ok) {
    const error = new Error("Google Places API error") as Error & {
      status?: number;
      details?: unknown;
    };
    error.status = googleResponse.status;
    error.details = googleData;
    throw error;
  }

  const places = googleData?.places ?? [];
  if (!places.length) {
    const error = new Error("Place not found") as Error & { status?: number };
    error.status = 404;
    throw error;
  }

  const place = places[0];

  return {
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
    review_url: `https://search.google.com/local/writereview?placeid=${place.id}`,
  };
}
