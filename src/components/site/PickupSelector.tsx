import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { searchPlaces, type PlaceResult } from "@/lib/places.functions";
import type { MeetupPoint, PickupSelection } from "@/lib/meetup-points";
import { MapPin, Hotel, Loader2, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Active meetup points assigned to a tour (falls back to all active points). */
export function useTourMeetupPoints(tourSlug: string | null | undefined) {
  return useQuery({
    queryKey: ["meetup-points", tourSlug],
    enabled: !!tourSlug,
    queryFn: async (): Promise<MeetupPoint[]> => {
      const { data: tour } = await supabase
        .from("tours" as never)
        .select("id")
        .eq("slug", tourSlug as string)
        .maybeSingle();
      const tourId = (tour as { id?: string } | null)?.id;

      if (tourId) {
        const { data: links } = await supabase
          .from("tour_meetup_points" as never)
          .select("meetup_point_id, sort_order")
          .eq("tour_id", tourId);
        const ids = ((links ?? []) as Array<{ meetup_point_id: string }>).map(
          (l) => l.meetup_point_id,
        );
        if (ids.length) {
          const { data } = await supabase
            .from("meetup_points" as never)
            .select("*")
            .in("id", ids)
            .eq("active", true)
            .order("sort_order", { ascending: true });
          return (data ?? []) as unknown as MeetupPoint[];
        }
      }

      const { data } = await supabase
        .from("meetup_points" as never)
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      return (data ?? []) as unknown as MeetupPoint[];
    },
  });
}

export function PickupSelector({
  tourSlug,
  pickupFeeCents,
  value,
  onChange,
}: {
  tourSlug: string;
  pickupFeeCents: number;
  value: PickupSelection | null;
  onChange: (v: PickupSelection | null) => void;
}) {
  const { data: points = [], isLoading } = useTourMeetupPoints(tourSlug);
  const search = useServerFn(searchPlaces);

  const [mode, setMode] = useState<"meetup" | "hotel">(value?.type ?? "meetup");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  const feeLabel = useMemo(
    () => `+€${(pickupFeeCents / 100).toFixed(0)}`,
    [pickupFeeCents],
  );

  // Preselect the first meetup point so the customer always has a valid pickup.
  useEffect(() => {
    if (mode === "meetup" && !value?.type && points[0]) {
      const p = points[0];
      onChange({
        type: "meetup",
        meetupPointId: p.id,
        meetupName: p.name,
        meetupAddress: p.address,
        meetupInstructions: p.instructions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, points.length]);

  // Debounced address search.
  useEffect(() => {
    if (mode !== "hotel" || term.trim().length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await search({ data: { query: term.trim() } });
        if (!cancelled) setResults(res);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, mode]);

  const chooseMeetup = (p: MeetupPoint) =>
    onChange({
      type: "meetup",
      meetupPointId: p.id,
      meetupName: p.name,
      meetupAddress: p.address,
      meetupInstructions: p.instructions,
    });

  const choosePlace = (p: PlaceResult) => {
    onChange({
      type: "hotel",
      placeName: p.name,
      address: p.address,
      latitude: p.latitude,
      longitude: p.longitude,
      placeId: p.placeId || null,
    });
    setResults([]);
    setTerm(p.name);
  };

  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">
        Pickup
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("meetup");
            onChange(null);
          }}
          className={cn(
            "rounded-lg border px-3 py-3 text-left transition",
            mode === "meetup"
              ? "border-gold bg-gold/10"
              : "border-border bg-cloud/40 hover:border-gold",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <MapPin className="w-4 h-4 text-gold" /> Meetup point
          </span>
          <span className="mt-1 block text-[11px] text-body">Included with tour</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("hotel");
            onChange(null);
          }}
          className={cn(
            "rounded-lg border px-3 py-3 text-left transition",
            mode === "hotel"
              ? "border-gold bg-gold/10"
              : "border-border bg-cloud/40 hover:border-gold",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <Hotel className="w-4 h-4 text-gold" /> Hotel pickup
          </span>
          <span className="mt-1 block text-[11px] text-body">{feeLabel} · door to door</span>
        </button>
      </div>

      {mode === "meetup" && (
        <div className="mt-3 space-y-2">
          {isLoading && (
            <p className="text-[12px] text-body flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading meetup points…
            </p>
          )}
          {!isLoading && points.length === 0 && (
            <p className="text-[12px] text-body">
              We'll agree the meeting place with you by WhatsApp after booking.
            </p>
          )}
          {points.map((p) => {
            const selected = value?.type === "meetup" && value.meetupPointId === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => chooseMeetup(p)}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left transition",
                  selected ? "border-gold bg-gold/10" : "border-border bg-cloud/40 hover:border-gold",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">{p.name}</span>
                  {selected && <Check className="w-4 h-4 text-gold shrink-0" />}
                </span>
                <span className="mt-0.5 block text-[12px] text-body">{p.address}</span>
                {p.instructions && (
                  <span className="mt-1 block text-[11px] text-body/80">{p.instructions}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {mode === "hotel" && (
        <div className="mt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-ink/40" />
            <input
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                if (value?.type === "hotel") onChange(null);
              }}
              placeholder="Search your hotel, apartment or address"
              className="w-full rounded-lg border border-border bg-cloud/40 pl-9 pr-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 animate-spin text-ink/40" />
            )}
          </div>

          {results.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-white divide-y divide-border">
              {results.map((r) => (
                <li key={`${r.placeId}-${r.latitude}`}>
                  <button
                    type="button"
                    onClick={() => choosePlace(r)}
                    className="w-full px-4 py-2.5 text-left hover:bg-cloud/60"
                  >
                    <span className="block text-sm text-ink">{r.name}</span>
                    <span className="block text-[11px] text-body">{r.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {value?.type === "hotel" && (
            <div className="mt-2 rounded-lg border border-gold bg-gold/10 px-4 py-3">
              <p className="text-sm font-medium text-ink flex items-center gap-2">
                <Check className="w-4 h-4 text-gold" /> {value.placeName}
              </p>
              <p className="text-[12px] text-body">{value.address}</p>
              <p className="mt-1 text-[11px] text-body">Pickup fee {feeLabel}</p>
            </div>
          )}

          {value?.type !== "hotel" && (
            <p className="mt-2 text-[11px] text-body">
              Pick your exact address from the list so your driver arrives at the right door.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
