import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGuestMessageSender } from "@/components/admin/GuestMessages";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { resetGuestToken } from "@/lib/guest-tour.functions";
import {
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Edit3,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Star,
  Trash2,
  Send,
  Map as MapIcon,
  RefreshCw,
} from "lucide-react";

const btn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50";

type Props = {
  booking: any;
  dueCents: number;
  waLink: string | null;
  reviewWaLink: string | null;
  emailTemplates: { key: string; label: string }[];
  sendingKey: string | null;
  onEmail: (key: string, label: string) => void;
  onTogglePayment: () => void;
  canRequestPayment: boolean;
  onCopyMessage: () => void;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

/** Three tidy menus holding every booking action. */
export function BookingActions(p: Props) {
  const { templates, send } = useGuestMessageSender(p.booking, p.dueCents);
  const busy = p.sendingKey?.startsWith(`${p.booking.id}:`);
  const [token, setToken] = useState<string | null>(p.booking.guest_token ?? null);
  const reset = useServerFn(resetGuestToken);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tuktuk24lisbon.com";
  const tripUrl = token ? `${origin}/trip/${token}` : null;
  const first = String(p.booking.customer_name || "").split(" ")[0];
  const tripMsg = tripUrl
    ? `Hi ${first}! Your tour is confirmed. Here is your personal tour page with your guide, meeting point and all the details: ${tripUrl}`
    : "";
  const tripWa =
    tripUrl && p.booking.phone
      ? `https://wa.me/${String(p.booking.phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(tripMsg)}`
      : null;
  const tripMail = tripUrl
    ? `mailto:${p.booking.email}?subject=${encodeURIComponent("Your Tuk Tuk 24 tour page")}&body=${encodeURIComponent(tripMsg)}`
    : null;
  const skip = new Set(["booking_confirmation", "tour_reminder", "review_request"]);

  return (
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={btn} disabled={!p.booking.phone}>
            <MessageCircle className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
            <span className="truncate">WhatsApp</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {p.waLink && (
            <DropdownMenuItem asChild>
              <a href={p.waLink} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp customer
              </a>
            </DropdownMenuItem>
          )}
          {tripWa && (
            <DropdownMenuItem asChild>
              <a href={tripWa} target="_blank" rel="noreferrer">
                <MapIcon className="h-4 w-4" /> Send guest tour page
              </a>
            </DropdownMenuItem>
          )}
          {p.reviewWaLink && (
            <DropdownMenuItem asChild>
              <a href={p.reviewWaLink} target="_blank" rel="noreferrer">
                <Star className="h-4 w-4" /> Review via WhatsApp
              </a>
            </DropdownMenuItem>
          )}
          {templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Ready messages</DropdownMenuLabel>
              {templates.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => send(t)}>
                  <Send className="h-4 w-4" /> {t.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={btn}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" strokeWidth={1.75} />}
            <span className="truncate">Email</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-[60vh] overflow-y-auto">
          <DropdownMenuItem onSelect={() => p.onEmail("booking_confirmation", "Confirmation")}>
            <Mail className="h-4 w-4" /> Send confirmation
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onEmail("tour_reminder", "Reminder")}>
            <Clock className="h-4 w-4" /> Send reminder
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onEmail("review_request", "Review request")}>
            <Star className="h-4 w-4" /> Ask for review
          </DropdownMenuItem>
          {tripMail && (
            <DropdownMenuItem asChild>
              <a href={tripMail}>
                <MapIcon className="h-4 w-4" /> Send guest tour page
              </a>
            </DropdownMenuItem>
          )}
          {p.canRequestPayment && (
            <DropdownMenuItem onSelect={p.onTogglePayment}>
              <CreditCard className="h-4 w-4" /> Request payment…
            </DropdownMenuItem>
          )}
          {p.emailTemplates.filter((t) => !skip.has(t.key)).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Other emails</DropdownMenuLabel>
              {p.emailTemplates
                .filter((t) => !skip.has(t.key))
                .map((t) => (
                  <DropdownMenuItem key={t.key} onSelect={() => p.onEmail(t.key, t.label)}>
                    <Mail className="h-4 w-4" /> {t.label}
                  </DropdownMenuItem>
                ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={btn}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="truncate">More</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={p.onCopyMessage}>
            <Copy className="h-4 w-4" /> Copy message
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onCopyLink}>
            <Link2 className="h-4 w-4" /> Copy link
          </DropdownMenuItem>
          {tripUrl && (
            <DropdownMenuItem
              onSelect={() => {
                navigator.clipboard?.writeText(tripUrl);
                toast.success("Guest tour link copied");
              }}
            >
              <MapIcon className="h-4 w-4" /> Copy guest tour link
            </DropdownMenuItem>
          )}
          {tripUrl && (
            <DropdownMenuItem asChild>
              <a href={tripUrl} target="_blank" rel="noreferrer">
                <MapIcon className="h-4 w-4" /> Open guest tour page
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={async () => {
              if (token && !confirm("Reset the guest link? The old link will stop working.")) return;
              try {
                const r = await reset({ data: { bookingId: p.booking.id } });
                setToken(r.token);
                toast.success("New guest link created");
              } catch (e: any) {
                toast.error(e?.message || "Could not reset link");
              }
            }}
          >
            <RefreshCw className="h-4 w-4" /> {token ? "Reset guest link" : "Create guest link"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onEdit}>
            <Edit3 className="h-4 w-4" /> Edit / changes
          </DropdownMenuItem>
          {p.dueCents > 0 && (
            <DropdownMenuItem asChild>
              <Link to="/admin/reconciliation">
                <CreditCard className="h-4 w-4" /> Settle balance
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
