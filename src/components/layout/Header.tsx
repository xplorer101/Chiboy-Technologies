"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { navigation } from "@/content/site";
import { cn } from "@/lib/utils/cn";

/**
 * Site header and mobile navigation.
 *
 * The desktop navigation and the mobile drawer share one `navLinks` list, so an
 * item can never be present in one and missing from the other.
 */

const navLinks = navigation;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * `phone` is the display string, `phoneHref` the validated `tel:` link.
 *
 * Both are produced by the server layout rather than built here: this is a
 * client component, and the link must be constructed by the same validated
 * helper the footer uses. Building it locally previously stripped the "+",
 * producing a `tel:` link with no country code that would not connect from
 * outside the local country. Rendering requires BOTH — a value with no safe
 * link is shown nowhere rather than as a dead link.
 */
export function Header({
  phone,
  phoneHref,
}: {
  phone: string;
  phoneHref?: string;
}) {
  const showPhone = Boolean(phone) && Boolean(phoneHref);
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the drawer whenever the route changes, otherwise it stays open on
  // top of the newly navigated page.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll and wire up Escape + focus containment while open.
  useEffect(() => {
    if (!isOpen) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        // Return focus to the control that opened the dialog.
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-charcoal-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="CHIBOY TECHNOLOGIES — home"
        >
          <Mark />
          <span className="text-sm leading-tight font-bold tracking-tight text-navy-900 sm:text-base">
            CHIBOY
            <span className="block font-semibold text-navy-600">TECHNOLOGIES</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-navy-900"
                    : "text-charcoal-600 hover:bg-charcoal-100 hover:text-navy-900",
                )}
              >
                {link.label}
                {/* Gold underline marks the current page without shifting layout. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 block h-0.5 rounded-full bg-gold-500 transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {showPhone ? (
            <a
              href={phoneHref}
              className="hidden min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-navy-800 transition-colors hover:bg-charcoal-100 lg:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              <span className="sr-only">Call </span>
              {phone}
            </a>
          ) : null}

          <ButtonLink
            href="/request-service"
            size="sm"
            variant="accent"
            className="hidden sm:inline-flex"
          >
            Request a Service
          </ButtonLink>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            className="inline-flex size-11 items-center justify-center rounded-lg text-navy-900 transition-colors hover:bg-charcoal-100 md:hidden"
          >
            <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
            {isOpen ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen ? (
        <>
          <div
            className="fixed inset-0 top-16 z-40 bg-navy-950/40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            tabIndex={-1}
            className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-charcoal-200 bg-white shadow-[var(--shadow-lift)] md:hidden"
          >
            <nav aria-label="Mobile" className="flex flex-col p-4">
              {navLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded-lg px-4 text-base font-medium transition-colors",
                      active
                        ? "bg-navy-50 text-navy-900"
                        : "text-charcoal-700 hover:bg-charcoal-100",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="mt-3 space-y-2 border-t border-charcoal-200 pt-4">
                <ButtonLink
                  href="/request-service"
                  variant="accent"
                  className="w-full"
                  onClick={() => setIsOpen(false)}
                >
                  Request a Service
                </ButtonLink>

                {showPhone ? (
                  <a
                    href={phoneHref}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-charcoal-300 text-base font-semibold text-navy-900"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {phone}
                  </a>
                ) : null}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}

/**
 * Brand mark: a navy rounded square with a gold chassis-like glyph. Drawn in
 * inline SVG so it costs no request and inherits currentColor cleanly.
 */
function Mark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <rect
          x="4.25"
          y="4.25"
          width="15.5"
          height="15.5"
          rx="2.5"
          stroke="var(--color-gold-500)"
          strokeWidth="1.6"
        />
        <path
          d="M9 9.5h6M9 12.5h6M9 15.5h3.5"
          stroke="var(--color-gold-500)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
