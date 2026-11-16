import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "border-primary/30 bg-primary-soft text-primary-soft-foreground", Icon: Info },
  success: { cls: "border-success/30 bg-success-soft text-success-soft-foreground", Icon: CheckCircle2 },
  warning: { cls: "border-warning/30 bg-warning-soft text-warning-soft-foreground", Icon: AlertTriangle },
  danger: { cls: "border-danger/30 bg-danger-soft text-danger-soft-foreground", Icon: XCircle },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-md border p-3 text-sm", cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}
