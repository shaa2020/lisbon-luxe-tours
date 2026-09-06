import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ExitPopup } from "@/components/site/ExitPopup";
import { PromoSlot } from "@/components/promo/PromoSlot";
import { gtmHeadScript, GtmNoScript, GtmPageViews, gtagSrc, gtagInitScript } from "@/components/analytics/Gtm";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow text-gold mb-3">404 — Wrong turn</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight">
          Lost in Lisbon?
        </h1>
        <p className="mt-4 text-sm text-body leading-relaxed">
          This page doesn't exist — but the best views in the city are only a short ride away.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/tours"
            className="inline-flex items-center justify-center rounded-full bg-gold px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink"
          >
            See our tours →
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-ink transition-colors hover:border-gold"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Tuk Tuk 24 — family-run tuk-tuk and minivan tours in Lisbon, Sintra, Cascais and Belém.",
      },
      { property: "og:site_name", content: "Tuk Tuk 24" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },

      { property: "og:image", content: "https://tuktuk24lisbon.com/__l5e/assets-v1/4c6e5056-d7f4-4af3-888c-8b7be3d509d9/social-banner.png" },
      { name: "twitter:image", content: "https://tuktuk24lisbon.com/__l5e/assets-v1/4c6e5056-d7f4-4af3-888c-8b7be3d509d9/social-banner.png" },
      { name: "theme-color", content: "#1e3a5f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Tuk Tuk 24" },
      { name: "google-site-verification", content: "4JQk2KhK0pEZsoCDlJR4Edx0b9W5O2eLIh6Eq4Qvzzk" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Fira+Sans:wght@300;400;500;600;700&family=Poppins:wght@500;600;700&family=Yellowtail&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/app-icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/app-icon-512.png" },
    ],
    scripts: [
      { src: gtagSrc, async: true },
      { children: gtagInitScript },
      ...(gtmHeadScript ? [{ children: gtmHeadScript }] : []),

      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "TravelAgency",
              "@id": "https://tuktuk24lisbon.com/#org",
              name: "Tuk Tuk 24",
              url: "https://tuktuk24lisbon.com",
              telephone: "+351922024690",
              email: "tuktuklisbon24@gmail.com",
              priceRange: "€€",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Lisbon",
                addressCountry: "PT",
              },
              areaServed: [
                "Lisbon",
                "Alfama",
                "Baixa",
                "Chiado",
                "Graça",
                "Belém",
                "Sintra",
                "Cascais",
                "Cabo da Roca",
                "Portugal",
              ],
            },
            {
              "@type": "WebSite",
              "@id": "https://tuktuk24lisbon.com/#website",
              url: "https://tuktuk24lisbon.com",
              name: "Tuk Tuk 24",
              publisher: { "@id": "https://tuktuk24lisbon.com/#org" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://tuktuk24lisbon.com/tours?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <GtmNoScript />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GtmPageViews />
        <Outlet />
        <ExitPopup />
        <PromoSlot placement="overlay" />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
