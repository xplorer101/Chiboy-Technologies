import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { cn } from "@/lib/utils/cn";

/**
 * The six-step service workflow: Understand → Assess → Recommend → Implement →
 * Test → Support.
 *
 * Defined once in `src/content/site.ts` and rendered here, so the process reads
 * identically on the overview and on all six detail pages. Shared across every
 * service because the promise is the same: the same six steps regardless of
 * which service is being delivered.
 *
 * Rendered as an ordered list because it *is* a sequence — the numbering is
 * meaningful and a screen reader should say "list, 6 items". The step numbers
 * are marked `aria-hidden` so the list is not announced as "1 of 6" twice.
 */
export function WorkflowSteps({
  steps,
  className,
}: {
  steps: readonly { title: string; body: string }[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="relative flex gap-4 rounded-[var(--radius-card)] border border-charcoal-200 bg-white p-6 shadow-[var(--shadow-card)]"
        >
          <span
            aria-hidden="true"
            className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-gold-400"
          >
            {index + 1}
          </span>

          <div className="min-w-0">
            <h3 className="font-semibold text-navy-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-charcoal-600">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Workflow wrapped in a full page section, for pages that want the standard
 * heading plus the steps.
 */
export function WorkflowSection({
  steps,
  id,
  tone = "muted",
}: {
  steps: readonly { title: string; body: string }[];
  id: string;
  tone?: "white" | "muted";
}) {
  return (
    <Section tone={tone} labelledBy={id}>
      <Container>
        <SectionHeading
          id={id}
          eyebrow="How we work"
          title="Our service process"
          lead="The same six steps follow every job, whatever the service, so you always know what is happening and what comes next."
          align="center"
        />

        <div className="mt-12">
          <WorkflowSteps steps={steps} />
        </div>
      </Container>
    </Section>
  );
}
