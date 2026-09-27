import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, Badge, ServiceIcon, TrustIcon } from "@/components/ui/Card";
import { Alert, FormErrorSummary } from "@/components/ui/Alert";
import { FaqAccordion } from "@/components/ui/Accordion";
import { TextField, SelectField, TextAreaField, PlaceholderValue } from "@/components/ui/Field";
import { trustPoints } from "@/content/site";
import { services } from "@/content/services";

/**
 * TEMPORARY — foundation smoke test.
 *
 * Exercises every primitive from the design system so Phase 2 can be verified
 * in isolation. Replaced by the real homepage in Phase 3.
 */
export default function FoundationCheck() {
  return (
    <>
      <Section tone="white">
        <Container>
          <SectionHeading
            eyebrow="Phase 2 check"
            title="Design system foundation"
            lead="Verifying tokens, layout primitives and every UI component render correctly."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
            <Button isLoading loadingText="Working">
              Primary
            </Button>
            <ButtonLink href="/services" variant="secondary">
              Link styled as button
            </ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="navy">Navy</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="placeholder">Placeholder</Badge>
          </div>
        </Container>
      </Section>

      <Section tone="muted">
        <Container>
          <h2 className="mb-6 text-2xl font-bold">Cards</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {trustPoints.map((point) => (
              <Card key={point.title}>
                <TrustIcon name={point.icon} className="size-6 text-navy-600" />
                <h3 className="mt-4 font-semibold text-navy-900">{point.title}</h3>
                <p className="mt-2 text-sm text-charcoal-600">{point.body}</p>
              </Card>
            ))}
            {services.slice(0, 3).map((service) => (
              <Card key={service.slug}>
                <ServiceIcon name={service.icon} className="size-6 text-navy-600" />
                <h3 className="mt-4 font-semibold text-navy-900">{service.name}</h3>
                <p className="mt-2 text-sm text-charcoal-600">{service.cardDescription}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="white">
        <Container width="narrow">
          <h2 className="mb-6 text-2xl font-bold">Alerts &amp; form fields</h2>
          <div className="space-y-4">
            <Alert tone="info">Informational message.</Alert>
            <Alert tone="success" title="Success">
              Your request has been received.
            </Alert>
            <Alert tone="error" title="Something went wrong">
              We could not submit the form. Please try again.
            </Alert>
            <Alert tone="warning">Placeholder business detail.</Alert>
            <FormErrorSummary errors={{ "Full name": "This field is required." }} />
          </div>

          <div className="mt-8 space-y-5">
            <TextField id="fc-name" label="Full Name" required placeholder="Jane Doe" />
            <TextField id="fc-email" label="Email" type="email" required error="Enter a valid email address." />
            <TextField id="fc-phone" label="Phone" type="tel" hint="Include your area code." />
            <SelectField
              id="fc-service"
              label="Service"
              required
              placeholder="Choose a service"
              options={services.map((s) => ({ value: s.slug, label: s.name }))}
            />
            <TextAreaField id="fc-desc" label="Description" required rows={4} />
            <p className="text-sm">
              Placeholder value:{" "}
              <PlaceholderValue value="[PLACEHOLDER: business email]" isPlaceholder />
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="muted">
        <Container width="narrow">
          <h2 className="mb-6 text-2xl font-bold">Accordion</h2>
          <FaqAccordion idPrefix="check" items={services[0]!.faqs} />
        </Container>
      </Section>
    </>
  );
}
