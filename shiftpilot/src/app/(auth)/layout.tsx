import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <BrandMark className="size-8" />
        <span className="text-lg font-semibold tracking-tight">ShiftPilot</span>
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm">{children}</div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:underline">Privacy notice</Link>
      </p>
    </div>
  );
}
