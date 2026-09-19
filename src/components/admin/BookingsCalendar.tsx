import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Users, Clock } from "lucide-react";
import {
  euro,
  todayKey,
  tourStageClass,
  paymentStateClass,
  TOUR_STAGE_LABEL,
  PAYMENT_STATE_LABEL,
  type BookingLedger,
} from "@/lib/booking-ledger";

export type CalendarBooking = {
  id: string;
  customer_name: string;
  tour_title: string | null;
  travel_date: string | null;
  travel_time?: string | null;
  guests: number;
  booking_reference?: string | null;
};

type View = "month" | "week" | "day";

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromKey(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfWeek(d: Date) {
  return addDays(d, -((d.getDay() + 6) % 7));
}

/**
 * Responsive tour calendar. Month / week / day views, every day is tappable
 * and every booking in the day list opens the booking itself.
 */
export function BookingsCalendar({
  bookings,
  ledgers,
  onOpen,
}: {
  bookings: CalendarBooking[];
  ledgers: Record<string, BookingLedger>;
  onOpen: (id: string) => void;
}) {
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<string>(() => todayKey());
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const byDate = useMemo(() => {
    const map: Record<string, CalendarBooking[]> = {};
    for (const b of bookings) {
      if (!b.travel_date) continue;
      (map[b.travel_date] ??= []).push(b);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.travel_time || "").localeCompare(b.travel_time || ""));
    }
    return map;
  }, [bookings]);

  const today = todayKey();
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const step = (dir: 1 | -1) => {
    if (view === "month") setCursor(new Date(year, month + dir, 1));
    else if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else {
      const next = addDays(fromKey(selected), dir);
      setSelected(dateKey(next));
      setCursor(next);
    }
  };

  const headerLabel =
    view === "month"
      ? new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "week"
        ? `${startOfWeek(cursor).toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${addDays(startOfWeek(cursor), 6).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
        : fromKey(selected).toLocaleDateString(undefined, { dateStyle: "full" });

  const monthCells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, i) => dateKey(new Date(year, month, i + 1))),
    ] as (string | null)[];
  }, [year, month]);

  const weekCells = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dateKey(addDays(startOfWeek(cursor), i))),
    [cursor],
  );

  const dayList = byDate[selected] ?? [];

  const DayCell = ({ k, compact }: { k: string; compact: boolean }) => {
    const list = byDate[k] ?? [];
    const isToday = k === today;
    const isSelected = k === selected;
    const guests = list.reduce((n, b) => n + (b.guests || 0), 0);
    return (
      <button
        type="button"
        onClick={() => {
          setSelected(k);
          if (view === "month") setCursor(fromKey(k));
        }}
        className={`flex flex-col rounded-lg border p-1.5 text-left transition ${compact ? "min-h-[58px]" : "min-h-[96px]"} ${
          isSelected
            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
            : isToday
              ? "border-primary/50"
              : "border-border hover:border-primary/40"
        }`}
      >
        <span
          className={`text-[11px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}
        >
          {Number(k.slice(-2))}
        </span>
        {list.length > 0 && (
          <>
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {list.length} · {guests}p
            </span>
            {!compact && (
              <span className="mt-1 space-y-0.5">
                {list.slice(0, 2).map((b) => (
                  <span
                    key={b.id}
                    className="block truncate rounded bg-muted px-1 py-0.5 text-[10px] text-foreground"
                  >
                    {(b.travel_time || "").slice(0, 5)} {b.customer_name}
                  </span>
                ))}
                {list.length > 2 && (
                  <span className="block text-[10px] text-muted-foreground">
                    +{list.length - 2} more
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:border-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="grid h-8 w-8 place-items-center rounded-full border border-border hover:border-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="ml-2 text-sm font-semibold">{headerLabel}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setView(v);
                if (v !== "month") setCursor(fromKey(selected));
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSelected(today);
              setCursor(new Date());
            }}
            className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Today
          </button>
        </div>
      </div>

      {view !== "day" && (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1 text-center">
                {d.slice(0, window.innerWidth < 480 ? 1 : 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {(view === "month" ? monthCells : weekCells).map((k, i) =>
              k === null ? (
                <div key={`e${i}`} className="min-h-[58px]" />
              ) : (
                <DayCell key={k} k={k} compact={view === "month"} />
              ),
            )}
          </div>
        </>
      )}

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {fromKey(selected).toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {dayList.length} booking{dayList.length === 1 ? "" : "s"}
        </p>
        {dayList.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tours on this day. Pick another date above.
          </p>
        ) : (
          <div className="space-y-2">
            {dayList.map((b) => {
              const l = ledgers[b.id];
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onOpen(b.id)}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary hover:bg-muted/40"
                >
                  <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {(b.travel_time || "--:--").slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{b.customer_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {b.tour_title || "Custom tour"}
                      {b.booking_reference ? ` · ${b.booking_reference}` : ""}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {b.guests}
                  </span>
                  {l && (
                    <>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tourStageClass(l.tourStage)}`}
                      >
                        {TOUR_STAGE_LABEL[l.tourStage]}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${paymentStateClass(l.paymentState)}`}
                      >
                        {PAYMENT_STATE_LABEL[l.paymentState]}
                      </span>
                      <span className="text-xs font-semibold tabular-nums">
                        {euro(l.paidCents)}
                        {l.dueCents > 0 && (
                          <span className="text-rose-600"> · {euro(l.dueCents)} due</span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
