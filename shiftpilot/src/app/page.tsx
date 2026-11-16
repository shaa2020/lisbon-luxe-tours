import Link from "next/link";
import { CalendarCheck2, ClipboardCheck, Receipt, ShieldCheck, Users, Building2 } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { Icon: Building2, title: "Client portal", text: "Clients request staff, follow attendance and approve hours online." },
  { Icon: Users, title: "Mixed workforce", text: "Separate, compliant pathways for agency employees and independent freelancers." },
  { Icon: CalendarCheck2, title: "Shift engine", text: "Formal shift lifecycle with database-level protection against double-booking." },
  { Icon: ClipboardCheck, title: "Attendance & timesheets", text: "Server-timestamped check-ins, client and agency approval, full history." },
  { Icon: Receipt, title: "Finance", text: "Immutable rate snapshots, gapless invoice numbering, payroll exports." },
  { Icon: ShieldCheck, title: "Secure by design", text: "Row-level security on every table, tenant isolation and an append-only audit log." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <BrandMark className="size-8" />
          <span className="text-lg font-semibold tracking-tight">ShiftPilot</span>
        </div>
        <Button asChild variant="secondary">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>
      <main>
        <section className="mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pt-16">
          <p className="mb-3 inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
            Staffing agency operations platform
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Run your staffing agency from one secure system.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Clients, workers, shifts, attendance, timesheets, invoicing and compliance — with separate portals for your team, your
            clients and your workers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">Sign in to ShiftPilot</Link>
            </Button>
          </div>
        </section>
        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="space-y-2">
                <span className="inline-flex rounded-md bg-primary-soft p-2 text-primary-soft-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} ShiftPilot</span>
        <Link href="/privacy" className="hover:underline">Privacy notice</Link>
      </footer>
    </div>
  );
}
