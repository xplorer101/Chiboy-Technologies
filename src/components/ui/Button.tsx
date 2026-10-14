import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Buttons.
 *
 * `buttonStyles` is exported separately from `Button` so that links and
 * router-navigating elements can look identical to buttons. This avoids a
 * `cloneElement`/slot abstraction: two small components sharing one style
 * function is easier to follow than a polymorphic wrapper.
 */

type Variant = "primary" | "secondary" | "accent" | "ghost" | "ghostDark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  // Comfortable tap target on every size, per mobile-first requirements.
  "min-h-11 text-center transition-colors duration-200 " +
  "disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  // Accent blue on white: the primary call to action across the site.
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
  // Outlined: the secondary call to action on light backgrounds.
  secondary:
    "border border-charcoal-300 bg-white text-navy-900 hover:border-charcoal-400 hover:bg-charcoal-50",
  // Alias kept so existing call sites keep working; the brand has one accent.
  accent: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
  ghost: "text-blue-700 hover:bg-charcoal-100",
  // For use on navy/charcoal surfaces.
  ghostDark: "border border-white/30 text-white hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-[0.9375rem]",
  lg: "px-7 py-3.5 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner and blocks interaction while an action is in flight. */
  isLoading?: boolean;
  loadingText?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & React.ComponentProps<typeof Link>) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export { Spinner };
