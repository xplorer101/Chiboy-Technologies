import type { Metadata } from "next";

import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { Container, Section } from "@/components/ui/Layout";

/**
 * Privacy policy.
 *
 * WHY THIS PAGE IS A SEPARATE, PLAIN ROUTE
 * ----------------------------------------
 * The policy is supplied by the business and states what it actually does with
 * the information a visitor sends. It is rendered as written, with only the
 * structural headings restated as clauses — rewriting the substance of a policy
 * would mean the published text no longer matched the text that was approved.
 *
 * WHY THE OLD /privacy ROUTE REDIRECTS HERE
 * -----------------------------------------
 * A `/privacy` route used to hold a draft that was never finished (it still
 * carried visible placeholders). That route now issues a permanent redirect to
 * this canonical page, so an already-indexed or bookmarked link lands on the
 * policy that is actually in force rather than on a stale draft.
 *
 * The effective date is part of the document and is written literally. It is
 * not derived from the build, because the date the policy takes effect is a
 * legal fact, not the date the site was last deployed.
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Chiboy Technologies collects, uses and protects personal information submitted through chiboytechnologies.com, in line with the Nigeria Data Protection Act 2023.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | Chiboy Technologies",
    description:
      "How Chiboy Technologies collects, uses and protects the personal information you send through this website.",
    url: "/privacy-policy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Chiboy Technologies",
    description:
      "How Chiboy Technologies collects, uses and protects the personal information you send through this website.",
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Privacy Policy" },
];

const EFFECTIVE_DATE = "14 October 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />

      <Section tone="muted" size="compact">
        <Container>
          <Breadcrumbs items={crumbs} />
        </Container>
      </Section>

      <Section>
        <Container>
          <article className="max-w-3xl">
            <h1 className="text-3xl font-semibold text-navy-900 sm:text-4xl">Privacy Policy</h1>
            <p className="mt-3 text-sm text-charcoal-600">
              Chiboy Technologies &mdash; Effective {EFFECTIVE_DATE}
            </p>

            <p className="mt-8 leading-relaxed text-charcoal-700">
              This policy explains what personal information Chiboy Technologies
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects through
              chiboytechnologies.com, why we collect it, and how we handle it. We
              process personal data in line with the Nigeria Data Protection Act 2023.
            </p>

            <div className="mt-10 space-y-10">
              <Clause index={1} title="Information we collect">
                <p>When you submit a service request, we collect:</p>
                <ul>
                  <li>Your name</li>
                  <li>Your email address and phone number</li>
                  <li>The service you need and the details you give us about it</li>
                  <li>Anything else you choose to include in your message</li>
                </ul>
                <p>
                  We generate a reference number for each request. If you contact us by
                  email, phone or WhatsApp, we keep the details you send us. We do not
                  collect payment card details through this website.
                </p>
              </Clause>

              <Clause index={2} title="How we use your information">
                <p>We use your information to:</p>
                <ul>
                  <li>Respond to your request and carry out the service</li>
                  <li>Send you confirmation and follow-up emails about your request</li>
                  <li>Keep records of work done, for support and warranty purposes</li>
                  <li>Meet our legal, tax and accounting obligations</li>
                  <li>Maintain the security of the website and improve our services</li>
                </ul>
                <p>
                  We do not sell your personal data, and we do not use it for third-party
                  advertising.
                </p>
              </Clause>

              <Clause index={3} title="Our basis for processing">
                <p>
                  We process your data because it is necessary to respond to your request
                  or provide the service you asked for, because the law requires it, or
                  because it serves our legitimate interest in running and securing our
                  business, provided that interest does not override your rights. Where we
                  rely on your consent, you may withdraw it at any time.
                </p>
              </Clause>

              <Clause index={4} title="Who we share it with">
                <p>
                  We share personal data only with service providers that help us run the
                  website and our business, such as hosting, database and email delivery
                  providers. They may process your data only on our instructions. We may
                  also disclose information where a court, regulator or law enforcement
                  body lawfully requires it.
                </p>
                <p>
                  Some of these providers operate outside Nigeria. Where your data is
                  transferred abroad, we use providers that apply appropriate safeguards.
                </p>
              </Clause>

              <Clause index={5} title="Cookies and logs">
                <p>
                  This website does not use advertising cookies. Our hosting provider may
                  keep standard server logs, including IP address, browser type and the
                  pages requested, for security and performance purposes.
                </p>
              </Clause>

              <Clause index={6} title="How long we keep your data">
                <p>
                  We keep your service request details for as long as the request is active
                  and for a reasonable period afterwards for support and record keeping,
                  unless the law requires us to keep them longer. After that, we delete or
                  anonymise them.
                </p>
              </Clause>

              <Clause index={7} title="Security">
                <p>
                  We protect your information with encrypted connections (HTTPS),
                  restricted database access and access controls on our accounts. No system
                  is completely secure. If a breach affecting your personal data occurs, we
                  will notify you and the Nigeria Data Protection Commission where the law
                  requires.
                </p>
              </Clause>

              <Clause index={8} title="Your rights">
                <p>Under the Nigeria Data Protection Act 2023, you have the right to:</p>
                <ul>
                  <li>Ask what personal data we hold about you and request a copy</li>
                  <li>Ask us to correct inaccurate or incomplete data</li>
                  <li>Ask us to delete your data, or restrict how we use it</li>
                  <li>Object to certain types of processing</li>
                  <li>Receive your data in a portable format</li>
                  <li>Withdraw your consent at any time</li>
                  <li>
                    Lodge a complaint with the Nigeria Data Protection Commission (
                    <a
                      href="https://ndpc.gov.ng"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy-800 underline decoration-charcoal-300 underline-offset-2 transition-colors hover:text-navy-600 hover:decoration-navy-400"
                    >
                      ndpc.gov.ng
                    </a>
                    )
                  </li>
                </ul>
                <p>
                  To exercise any of these rights, contact us using the details below. We
                  will respond within the time the law requires.
                </p>
              </Clause>

              <Clause index={9} title="Children">
                <p>
                  Our services are not directed at anyone under 18, and we do not knowingly
                  collect personal data from children. If you believe a child has sent us
                  their information, contact us and we will delete it.
                </p>
              </Clause>

              <Clause index={10} title="Links to other websites">
                <p>
                  This website may link to third-party services, such as WhatsApp. Their
                  own privacy policies apply once you leave our site, and we are not
                  responsible for their practices.
                </p>
              </Clause>

              <Clause index={11} title="Changes to this policy">
                <p>
                  We may update this policy from time to time. The effective date at the top
                  shows when it was last revised. Continued use of the website after a
                  change means you accept the updated policy.
                </p>
              </Clause>

              <Clause index={12} title="Contact us">
                <address className="not-italic">
                  Chiboy Technologies
                  <br />
                  Suite 12, City Shoppers Plaza
                  <br />
                  Kuje
                  <br />
                  FCT - ABUJA
                </address>
                <p>
                  Email:{" "}
                  <a
                    href="mailto:support@chiboytechnologies.com"
                    className="text-navy-800 underline decoration-charcoal-300 underline-offset-2 transition-colors hover:text-navy-600 hover:decoration-navy-400"
                  >
                    support@chiboytechnologies.com
                  </a>
                </p>
              </Clause>
            </div>
          </article>
        </Container>
      </Section>
    </>
  );
}

/**
 * A numbered clause.
 *
 * Numbered rather than plain headings because a policy is something people are
 * usually looking for one specific part of, and "clause 4" is citable in a
 * conversation in a way that "the paragraph about storage" is not. The heading
 * still carries the title, so the number costs nothing in readability.
 */
function Clause({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-navy-900">
        <span className="mr-2 text-blue-600 tabular-nums">{index}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-4 leading-relaxed text-charcoal-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-navy-900">
        {children}
      </div>
    </section>
  );
}
