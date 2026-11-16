import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="rounded-full bg-warning-soft p-3 text-warning-soft-foreground"><ShieldAlert className="size-6" aria-hidden /></span>
      <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Your role does not include this area. Ask an administrator if you need access.</p>
      <Link href="/portal" className="text-sm text-primary hover:underline">Go to your portal</Link>
    </main>
  );
}
