import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteBrand } from "@/lib/brand";
import { useAdminBadges } from "@/lib/admin-stats";
import { PushNotifications } from "@/components/admin/PushNotifications";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminPromotions, isPromotionLive } from "@/lib/promotions";
import {
  LayoutDashboard,
  Map,
  CalendarCheck,
  CreditCard,
  MoreHorizontal,
  BookOpen,
  Star,
  MessageSquare,
  LogOut,
  ExternalLink,
  X,
  Sparkles,
  HelpCircle,
  Settings,
  Compass,
  MapPin,
  Gauge,
  Megaphone,
  Tag,
  Mail,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Users,
  ShieldAlert,
  KeyRound,
  Scale,
  Percent,
  History,
  Globe,
} from "lucide-react";
import { ROLE_LABELS, type Permission } from "@/lib/permissions";
import { InstallAppButton } from "@/components/admin/InstallAppButton";


type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc?: string;
  perm: Permission;
};

type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, desc: "Revenue and activity", perm: "dashboard.view" }],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck, desc: "Requests and schedule", perm: "bookings.view" },
      { to: "/admin/ops", label: "Day sheet & fleet", icon: Gauge, desc: "Today, guides, vehicles", perm: "ops.view" },
      { to: "/admin/meetup-points", label: "Meeting points", icon: MapPin, desc: "Where guests meet the tuk tuk", perm: "ops.view" },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/admin/orders", label: "Orders", icon: CreditCard, desc: "Payments and refunds", perm: "orders.view" },
      { to: "/admin/reconciliation", label: "Reconciliation", icon: Scale, desc: "Money checked against PayPal", perm: "orders.view" },
      { to: "/admin/commission", label: "Commission", icon: Percent, desc: "My cut and guide balances", perm: "payments.manage" },
    ],
  },
  {
    title: "Inbox",
    items: [
      { to: "/admin/messages", label: "Messages", icon: MessageSquare, desc: "Contact inbox", perm: "messages.view" },
      { to: "/admin/leads", label: "Leads & chats", icon: MessageSquare, desc: "WhatsApp and AI enquiries", perm: "bookings.view" },
      { to: "/admin/emails", label: "Emails", icon: Mail, desc: "Templates and send log", perm: "emails.manage" },
      { to: "/admin/guest-messages", label: "Guest messages", icon: MessageSquare, desc: "One-tap WhatsApp texts", perm: "emails.manage" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { to: "/admin/tours", label: "Tours", icon: Map, desc: "Catalogue and pricing", perm: "tours.manage" },
      { to: "/admin/custom-builder", label: "Custom builder", icon: Sparkles, desc: "Build-your-own options", perm: "tours.manage" },
      { to: "/admin/discounts", label: "Discounts", icon: Tag, desc: "Promo codes", perm: "discounts.manage" },
      { to: "/admin/promotions", label: "Promotions", icon: Megaphone, desc: "Banners and campaigns", perm: "settings.manage" },
    ],
  },
  {
    title: "Content",
    items: [
      { to: "/admin/blog", label: "Journal", icon: BookOpen, desc: "Stories and news", perm: "content.manage" },
      { to: "/admin/ai-writer", label: "AI Writer", icon: Sparkles, desc: "Draft articles with AI", perm: "content.manage" },
      { to: "/admin/guide", label: "Travel guide", icon: Compass, desc: "SEO guide hub", perm: "content.manage" },
      { to: "/admin/destinations", label: "Destinations", icon: MapPin, desc: "Area pages for Google", perm: "content.manage" },
      { to: "/admin/reviews", label: "Reviews", icon: Star, desc: "Approve guest reviews", perm: "reviews.manage" },
      { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, desc: "Questions and answers", perm: "faqs.manage" },
    ],
  },
  {
    title: "Growth",
    items: [
      { to: "/admin/web-intel", label: "Web Intelligence", icon: Globe, desc: "Find partners and research (free tier)", perm: "marketing.manage" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: Settings, desc: "Brand, booking, payments", perm: "settings.manage" },
      { to: "/admin/team", label: "Team", icon: Users, desc: "Members and roles", perm: "team.manage" },
      { to: "/admin/api", label: "API keys", icon: KeyRound, desc: "WhatsApp, n8n, AI agents", perm: "api.manage" },
      { to: "/admin/audit-log", label: "Activity log", icon: History, desc: "Who changed what", perm: "settings.manage" },
    ],
  },
];


/** Bottom tab bar targets on mobile. */
const PRIMARY: NavItem[] = [
  { to: "/admin/ops/today", label: "Today", icon: Gauge, perm: "ops.view" },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck, perm: "bookings.view" },
  { to: "/admin/reconciliation", label: "Settle cash", icon: Scale, perm: "orders.view" },
  { to: "/admin/messages", label: "Inbox", icon: MessageSquare, perm: "messages.view" },
];

function isActiveRoute(to: string, pathname: string) {
  if (to === "/admin") return pathname === "/admin";
  return pathname === to || pathname.startsWith(to + "/");
}


function Badge({ n, small = false }: { n: number; small?: boolean }) {
  if (!n) return null;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold bg-destructive text-destructive-foreground ${
        small ? "min-w-[16px] h-[16px] px-1 text-[9px]" : "min-w-[20px] h-5 px-1.5 text-[10px]"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminShell({ children, requires }: { children: ReactNode; requires?: Permission }) {
  const { user, isAdmin, role, can, loading, signOut } = useAuth();
  const { brandName, logoUrl, business } = useSiteBrand();
  const { data: allPromotions } = useAdminPromotions();
  const livePromotions = (allPromotions ?? []).filter((p) => isPromotionLive(p));
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data: badges } = useAdminBadges();
  const queryClient = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groupOverride, setGroupOverride] = useState<Record<string, boolean>>({});


  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({ ...g, items: g.items.filter((n) => can(n.perm)) })).filter(
        (g) => g.items.length > 0,
      ),
    [can],
  );
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const primary = useMemo(() => PRIMARY.filter((n) => can(n.perm)), [can]);

  const badgeFor = (to: string): number => {
    if (to === "/admin/bookings") return badges?.bookings ?? 0;
    if (to === "/admin/messages") return badges?.messages ?? 0;
    if (to === "/admin/reviews") return badges?.reviews ?? 0;
    return 0;
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ to: "/admin/login", search: { redirect: location.pathname } });
    }
  }, [loading, user, isAdmin, navigate, location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
    setDrawerOpen(false);
    setUserMenu(false);
    setNotifOpen(false);
    setQuery("");
  }, [location.pathname]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter((n) => n.label.toLowerCase().includes(q) || n.desc?.toLowerCase().includes(q)).slice(0, 6);
  }, [query, all]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 text-foreground">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  const current = all.find((n) => isActiveRoute(n.to, location.pathname));
  const currentLabel = current?.label ?? "Admin";
  const moreItems = all.filter((n) => !primary.some((p) => p.to === n.to));
  const moreActive = moreItems.some((n) => isActiveRoute(n.to, location.pathname));
  const moreBadge = (badges?.messages ?? 0) + (badges?.reviews ?? 0);
  const totalAlerts = (badges?.bookings ?? 0) + (badges?.messages ?? 0) + (badges?.reviews ?? 0);
  const initials = (user.email ?? "A").slice(0, 2).toUpperCase();
  const roleLabel = role ? ROLE_LABELS[role] : "Admin";
  const allowed = !requires || can(requires);
  const waHref = business?.whatsappPhone
    ? `https://wa.me/${business.whatsappPhone.replace(/[^0-9]/g, "")}`
    : null;


  const SidebarBody = (
    <>
      <div className="px-4 py-5 flex items-center gap-3">
        <img
          src={logoUrl ?? ""}
          alt=""
          className="h-10 w-10 rounded-xl object-contain bg-muted/60 p-1 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none truncate">{brandName}</p>
          <p className="text-[11px] text-muted-foreground truncate">Lisbon Tours</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {groups.map((group) => {
          const hasActive = group.items.some((n) => isActiveRoute(n.to, location.pathname));
          const open = groupOverride[group.title] ?? (hasActive || group.title === "Overview");
          const groupBadge = group.items.reduce((s, n) => s + badgeFor(n.to), 0);
          const single = group.items.length === 1;
          return (
            <div key={group.title}>
              {!single && (
                <button
                  onClick={() =>
                    setGroupOverride((prev) => ({ ...prev, [group.title]: !open }))
                  }
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70 hover:text-foreground"
                >
                  <span>{group.title}</span>
                  {!open && groupBadge > 0 && <Badge n={groupBadge} small />}
                  <ChevronDown
                    className={`ml-auto w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              {(open || single) && (
                <div className="space-y-1">
                  {group.items.map((n) => {
                    const active = isActiveRoute(n.to, location.pathname);
                    const Icon = n.icon;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        className={`group ios-press flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition-colors ${
                          active
                            ? "bg-primary/12 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                        }`}
                      >
                        <Icon className={`w-[19px] h-[19px] shrink-0 ${active ? "stroke-[2.3]" : ""}`} />
                        <span className="truncate">{n.label}</span>
                        <span className="ml-auto shrink-0">
                          <Badge n={badgeFor(n.to)} small />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>



      <div className="p-3 space-y-3">
        {livePromotions.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Megaphone className="w-3 h-3" /> {livePromotions.length} promo live
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{livePromotions[0].headline}</p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={logoUrl ?? ""} alt="" className="h-9 w-9 rounded-xl object-contain bg-card p-1" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{brandName}</p>
              <p className="text-[11px] text-muted-foreground truncate">Your City, Your Story.</p>
            </div>
          </div>
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            View Website <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] ios-grouped text-foreground md:flex">
      {/* ============= Desktop sidebar ============= */}
      <aside className="hidden md:flex w-[250px] lg:w-[272px] shrink-0 flex-col ios-blur border-r border-[var(--ios-hairline)] sticky top-0 h-[100dvh]">
        {SidebarBody}
      </aside>

      {/* ============= Mobile drawer ============= */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] bg-card border-r border-border flex flex-col">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-2 top-3 w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            {SidebarBody}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ============= Top bar (all sizes) ============= */}
        <header
          className="sticky top-0 z-30 ios-blur ios-hairline-b"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="h-[56px] sm:h-16 px-3 sm:px-5 flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden ios-press w-10 h-10 shrink-0 grid place-items-center rounded-full text-primary hover:bg-foreground/[0.04]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="relative flex-1 min-w-0 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full h-10 rounded-full border border-transparent bg-foreground/[0.05] pl-10 pr-3 text-[15px] outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card"
              />
              {results.length > 0 && (
                <div className="absolute left-0 right-0 top-12 ios-card overflow-hidden z-40 divide-y divide-[var(--ios-hairline)]">
                  {results.map((r) => {
                    const Icon = r.icon;
                    return (
                      <Link
                        key={r.to}
                        to={r.to}
                        onClick={() => setQuery("")}
                        className="flex items-center gap-2.5 px-4 py-3 text-[15px] hover:bg-foreground/[0.04]"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{r.label}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground truncate hidden sm:inline">
                          {r.desc}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
              <InstallAppButton />
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:grid ios-press w-10 h-10 place-items-center rounded-full text-emerald-600 hover:bg-foreground/[0.04]"
                  aria-label="WhatsApp"
                >
                  <MessageSquare className="w-5 h-5" />
                </a>
              )}
              <div className="relative">
                <button
                  onClick={() => {
                    setUserMenu(false);
                    setNotifOpen((v) => !v);
                  }}
                  className="relative ios-press grid w-10 h-10 place-items-center rounded-full text-muted-foreground hover:bg-foreground/[0.04]"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {totalAlerts > 0 && (
                    <span className="absolute -top-0.5 -right-0.5">
                      <Badge n={totalAlerts} small />
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-12 w-72 ios-card p-1.5 z-40">
                    <p className="px-2.5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                      Notifications
                    </p>
                    {totalAlerts === 0 ? (
                      <p className="px-2.5 pb-3 pt-1 text-sm text-muted-foreground">
                        You're all caught up.
                      </p>
                    ) : (
                      <>
                        {(badges?.bookings ?? 0) > 0 && (
                          <Link
                            to="/admin/bookings"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm hover:bg-accent"
                          >
                            <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">
                              {badges?.bookings} new booking{(badges?.bookings ?? 0) > 1 ? "s" : ""}
                            </span>
                            <span className="ml-auto">
                              <Badge n={badges?.bookings ?? 0} small />
                            </span>
                          </Link>
                        )}
                        {(badges?.messages ?? 0) > 0 && (
                          <Link
                            to="/admin/messages"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm hover:bg-accent"
                          >
                            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">
                              {badges?.messages} new message{(badges?.messages ?? 0) > 1 ? "s" : ""}
                            </span>
                            <span className="ml-auto">
                              <Badge n={badges?.messages ?? 0} small />
                            </span>
                          </Link>
                        )}
                        {(badges?.reviews ?? 0) > 0 && (
                          <Link
                            to="/admin/reviews"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm hover:bg-accent"
                          >
                            <Star className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">
                              {badges?.reviews} review{(badges?.reviews ?? 0) > 1 ? "s" : ""} to approve
                            </span>
                            <span className="ml-auto">
                              <Badge n={badges?.reviews ?? 0} small />
                            </span>
                          </Link>
                        )}
                      </>
                    )}
                    <div className="mt-1 border-t border-border px-2.5 pt-3 pb-1">
                      <PushNotifications compact />
                    </div>
                  </div>
                )}
              </div>


              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    setUserMenu((v) => !v);
                  }}
                  className="flex items-center gap-2 ios-press rounded-full px-1.5 sm:px-2 py-1.5 hover:bg-foreground/[0.04]"
                >
                  <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-primary/12 text-primary text-xs font-bold">
                    {initials}
                  </span>
                  <span className="hidden lg:block text-left leading-tight max-w-[140px]">
                    <span className="block text-sm font-semibold truncate">{user.email?.split("@")[0]}</span>
                    <span className="block text-[11px] text-muted-foreground">{roleLabel}</span>
                  </span>
                  <ChevronDown className="hidden lg:block w-4 h-4 text-muted-foreground" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-12 w-56 ios-card p-1.5 z-40">
                    <p className="px-2.5 py-2 text-[11px] text-muted-foreground truncate">{user.email}</p>
                    <div className="px-1 pb-1.5">
                      <InstallAppButton variant="full" />
                    </div>
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <Link to="/" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent">
                      <ExternalLink className="w-4 h-4" /> View website
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-accent text-destructive"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="md:hidden px-4 pb-2.5 -mt-0.5">
            <p className="truncate font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">
              {currentLabel}
            </p>
          </div>
        </header>

        {/* ============= Main ============= */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-5 md:py-7 pb-[calc(env(safe-area-inset-bottom)+92px)] md:pb-14">
          {allowed ? (
            children
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <h2 className="font-display text-xl font-bold">No access</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your role ({roleLabel}) doesn&apos;t include this section. Ask an owner if you need it.
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </main>
      </div>

      {/* ============= Mobile bottom tab bar ============= */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 ios-blur border-t border-[var(--ios-hairline)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid h-[54px]" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map((n) => {
            const active = isActiveRoute(n.to, location.pathname);
            const Icon = n.icon;
            const b = badgeFor(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative ios-press flex flex-col items-center justify-center gap-[3px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-[23px] h-[23px] ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
                  {b > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground">
                      {b > 9 ? "9+" : b}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{n.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${
              moreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5" />
              {moreBadge > 0 && (
                <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground">
                  {moreBadge > 9 ? "9+" : moreBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {/* ============= More sheet ============= */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-card border-t border-border max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="sticky top-0 bg-card px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
              <p className="font-display font-bold text-base">All sections</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {groups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((n) => {
                      const Icon = n.icon;
                      const active = isActiveRoute(n.to, location.pathname);
                      const b = badgeFor(n.to);
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          className={`rounded-xl border p-3 active:scale-[0.98] transition ${
                            active ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`w-5 h-5 ${active ? "text-white" : "text-muted-foreground"}`} />
                            <Badge n={b} small />
                          </div>
                          <p className="text-sm font-semibold leading-tight">{n.label}</p>
                          {n.desc && <p className="text-[11px] text-muted-foreground leading-snug">{n.desc}</p>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => signOut()}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Shared page primitives ============================ */

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-1.5">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function AdminCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(30,58,95,0.04)] ${className}`}>
      {children}
    </div>
  );
}
