import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&accept-language=es`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "47Picos-App/1.0 (contacto@47picos.es)",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.warn(`Nominatim geocoding responded with status ${res.status}`);
      return NextResponse.json([]);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("Geocoding proxy error:", err);
    return NextResponse.json([]);
  }
}
