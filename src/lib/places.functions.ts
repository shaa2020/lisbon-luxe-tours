import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

/**
 * Address / hotel search for the pickup step.
 *
 * Uses Google Places when a key is configured, otherwise the free
 * OpenStreetMap search. Both return the same shape so the booking record is
 * identical either way and the provider can be swapped without a data change.
 */
export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().trim().min(3).max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const googleKey = process.env["GOOGLE_PLACES_API_KEY"];

    if (googleKey) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: data.query,
          languageCode: "en",
          locationBias: {
            circle: { center: { latitude: 38.7223, longitude: -9.1393 }, radius: 40000 },
          },
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
          }>;
        };
        return (json.places ?? [])
          .filter((p) => p.location?.latitude != null && p.location?.longitude != null)
          .slice(0, 8)
          .map((p) => ({
            placeId: p.id || "",
            name: p.displayName?.text || p.formattedAddress || data.query,
            address: p.formattedAddress || "",
            latitude: Number(p.location?.latitude),
            longitude: Number(p.location?.longitude),
          }));
      }
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("countrycodes", "pt");
    url.searchParams.set("accept-language", "en");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "TukTuk24 Booking (https://tuktuk24lisbon.com)" },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      place_id?: number | string;
      osm_type?: string;
      osm_id?: number | string;
      name?: string;
      display_name?: string;
      lat?: string;
      lon?: string;
    }>;

    return rows
      .filter((r) => r.lat && r.lon)
      .map((r) => {
        const full = r.display_name || "";
        const name = (r.name && r.name.trim()) || full.split(",")[0] || data.query;
        return {
          placeId: r.osm_type && r.osm_id ? `osm:${r.osm_type}:${r.osm_id}` : String(r.place_id ?? ""),
          name,
          address: full,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
        };
      });
  });
