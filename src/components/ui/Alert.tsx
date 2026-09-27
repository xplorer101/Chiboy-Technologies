import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";

/**
 * Status and error messaging.
 *
 * `role="alert"` on the error variant means a failed submission is announced
 * immediately by screen readers without the user having to go looking for it.
 */

export function Alert({
  children,
  tone = "info",
  title,
  className,
  /** Announce the message as soon as it appears. Use for async results. */
  live,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error" | "warning";
  title?: string;
  className?: string;
  live?: boolean;
}) {
  const tones = {
    info: {
      wrapper: "border-navy-200 bg-navy-50 text-navy-900",
      icon: "text-navy-600",
      Icon: Info,
    },
    success: {
      wrapper: "border-success-600/30 bg-success-50 text-success-600",
      icon: "text-success-600",
      Icon: CheckCircle2,
    },
    error: {
      wrapper: "border-danger-600/30 bg-danger-50 text-danger-600",
      icon: "text-danger-600",
      Icon: TriangleAlert,
    },
    warning: {
      wrapper: "border-gold-600/40 bg-gold-500/10 text-gold-700",
      icon: "text-gold-600",
      Icon: TriangleAlert,
    },
  } as const;

  const { wrapper, icon, Icon } = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : live ? "status" : undefined}
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        wrapper,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="break-anywhere leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
