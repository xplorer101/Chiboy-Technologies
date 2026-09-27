import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * FAQ accordion.
 *
 * Built on native `<details>`/`<summary>` rather than a JS disclosure pattern.
 * That gives correct semantics, keyboard operation and find-in-page behaviour
 * for free, and keeps the component entirely server-rendered with no client
 * JavaScript. The shared `name` attribute makes the panels mutually exclusive
 * where the browser supports it.
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export function FaqAccordion({
  items,
  idPrefix,
  className,
}: {
  items: readonly FaqItem[];
  /** Used to build unique ids for the `aria-controls` wiring. */
  idPrefix: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-charcoal-200 overflow-hidden rounded-[var(--radius-card)] border border-charcoal-200 bg-white",
        className,
      )}
    >
      {items.map((item, index) => {
        const panelId = `${idPrefix}-faq-panel-${index}`;
        const buttonId = `${idPrefix}-faq-button-${index}`;

        return (
          <details key={item.question} name={idPrefix} className="group">
            <summary
              id={buttonId}
              aria-controls={panelId}
              className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-semibold text-navy-900 transition-colors hover:bg-charcoal-50 [&::-webkit-details-marker]:hidden"
            >
              {item.question}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 text-navy-600 transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="px-5 pb-5 leading-relaxed text-charcoal-600"
            >
              {item.answer}
            </div>
          </details>
        );
      })}
    </div>
  );
}
