import type { Metadata } from "next";

import { ContactChannels } from "@/components/contact/ContactChannels";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/ui/Breadcrumbs";
import { Container, Section } from "@/components/ui/Layout";
import { getNotificationConfig, getPublicEnv, hasRedisConfig } from "@/lib/env";

/**
 * Privacy policy.
 *
 * WHY THIS PAGE IS MOSTLY FACTS AND NO PROMISES
 * ---------------------------------------------
 * A privacy policy is the one page where being reassuring is worse than being
 * brief. It states what the site actually does with what a visitor gives it —
 * no analytics, no tracking, no advertising, no cookies set by the application —
 * and it does not claim compliance with a regime the business has not been
 * assessed against, because that claim would itself be the misleading part.
 *
 * WHY THE DRAFT NOTICE IS VISIBLE ON THE PAGE
 * -------------------------------------------
 * Three things are genuinely unknown and are not invented: the registered legal
 * entity, how long enquiries are kept, and whether a data protection officer has
 * been appointed. A published policy that quietly omitted them would read as
 * complete. A visible notice says plainly that it is a draft, which is the
 * honest description of its current state.
 *
 * The named infrastructure providers are the ones actually configured for this
 * deployment. If any of them changes, this page has to change with it — the
 * alternative is a policy describing an architecture the site no longer runs.
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How CHIBOY TECHNOLOGIES handles information you send through this website, what is collected, where it is stored and who can see it.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | CHIBOY TECHNOLOGIES",
    description:
      "How CHIBOY TECHNOLOGIES handles information you send through this website.",
    url: "/privacy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | CHIBOY TECHNOLOGIES",
    description:
      "How CHIBOY TECHNOLOGIES handles information you send through this website.",
  },
};

const crumbs = [
  { label: "Home", href: "/" },
  { label: "Privacy Policy" },
];

/** Set when the business supplies a registered entity name. */
const LEGAL_ENTITY = "[registered legal entity name]";
const RETENTION_PERIOD = "[retention period]";
const DATA_PROTECTION_OFFICER = "[data protection contact]";

export default function PrivacyPage() {
  const { siteUrl } = getPublicEnv();
  const rateLimited = hasRedisConfig();
  // Which notification channels are live decides which processors appear below.
  //
  // These are read at BUILD time, because this page is statically rendered. That
  // is the right trade for a page that should not change, but it means enabling a
  // channel in the environment is not enough — the site has to be rebuilt before
  // the policy starts naming that provider. A policy that under-declares its
  // processors is worse than one that is out of date, so this is called out in
  // the README's go-live checklist.
  const notifications = getNotificationConfig();
  const emailNotifications = notifications.email !== null;
  const whatsappNotifications = notifications.whatsapp !== null;

  return (
    <>
      <script
        type="application/ld+json"
        // Breadcrumbs only. There is deliberately no `WebPage`/`Article` node:
        // publishing one would invite a search engine to index a draft as though
        // it were settled policy.
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
            <h1 className="text-3xl font-bold text-navy-900 sm:text-4xl">Privacy Policy</h1>
            <p className="mt-3 text-sm text-charcoal-600">
              Applies to {siteUrl} and to the two forms on this site.
            </p>

            <div className="mt-8 rounded-lg border border-gold-600/40 bg-gold-500/10 p-5 text-charcoal-800">
              <h2 className="text-sm font-bold text-gold-700">This is a draft</h2>
              <p className="mt-2 text-sm leading-relaxed">
                Parts of this policy are still to be confirmed by the business before it
                is final: the registered legal entity, how long enquiries are kept, and
                who to contact about a data request. They are marked in the text below
                rather than left out, so nothing here should be read as settled.
              </p>
            </div>

            <div className="mt-10 space-y-10">
              <Clause index={1} title="Who this policy covers">
                <p>
                  This policy covers the website at {siteUrl}, operated under the
                  trading name <strong>CHIBOY TECHNOLOGIES</strong>. The registered
                  legal entity behind that name is <em>{LEGAL_ENTITY}</em>.
                </p>
                <p>
                  The legal entity is not yet confirmed, and is marked rather than
                  guessed. A wrong entity name in a policy is the kind of detail that is
                  relied on, so it will be filled in before this page goes live rather
                  than after.
                </p>
              </Clause>

              <Clause index={2} title="What this site collects">
                <p>
                  This website has no accounts, no login and no membership. It collects
                  only what you type into a form or click a link for.
                </p>
                <ul>
                  <li>
                    <strong>Contact form.</strong> Your name, your email address, and
                    optionally a phone number, plus the message you write.
                  </li>
                  <li>
                    <strong>Service request form.</strong> Your name, email address,
                    phone number, the service you choose, where the work is needed, how
                    you would prefer to be contacted, and the description you write. If
                    you attach files, those files and their names are collected too.
                  </li>
                  <li>
                    <strong>Server logs.</strong> Like any web server, the host records
                    the IP address and timestamp of each request, in order to serve the
                    page and keep it working.
                  </li>
                </ul>
              </Clause>

              <Clause index={3} title="What it does not do">
                <p>
                  There is no analytics script, no advertising, no advertising cookie,
                  no social media tracker, no fingerprinting and no third-party embed on
                  this site. Nothing you do here is shared with an advertising network,
                  because there is no advertising network connected to it.
                </p>
                <p>
                  This site sets no cookies of its own. The forms do not create a
                  session, so there is no cookie to identify you with.
                </p>
              </Clause>

              <Clause index={4} title="Why it collects it">
                <p>
                  So that we can answer you. That is the entire purpose. Your details
                  are used to respond to the enquiry you sent, to quote for the work if
                  you asked for one, and to keep a record of what was agreed.
                </p>
                <p>
                  We do not use your details for marketing, and we do not sell or share
                  them with anyone for anyone else&apos;s benefit.
                </p>
              </Clause>

              <Clause index={5} title="Where it is stored">
                <p>Enquiries are stored in a database. Attachments, if any, are stored on the server.</p>
                <ul>
                  <li>
                    <strong>Database.</strong> Supabase, which provides the PostgreSQL
                    database this site reads from and writes to.
                  </li>
                  <li>
                    <strong>Hosting.</strong> Vercel, which serves the site. Vercel
                    processes the request in order to return the page.
                  </li>
                  <li>
                    <strong>Attachments.</strong> Written to a directory on the server
                    that is not served to the public. They cannot be fetched by guessing
                    a web address.
                  </li>
                  {rateLimited ? (
                    <li>
                      <strong>Rate limiting.</strong> Upstash, which counts how many
                      times a connection submits a form. This sends the connecting IP
                      address to Upstash for the length of the counting window, and
                      nothing else.
                    </li>
                  ) : null}
                  {emailNotifications ? (
                    <li>
                      <strong>Email notification.</strong> Resend, which delivers the
                      notification email to the address that receives enquiries. The
                      message contains the name, phone number, email address, chosen
                      service, location, contact preference and the description you
                      wrote — in other words, the enquiry itself. Your email address is
                      also set as the reply address, so replying to the notification
                      reaches you directly. Attachments are{" "}
                      <em>not</em> included in the email.
                    </li>
                  ) : null}
                  {whatsappNotifications ? (
                    <li>
                      <strong>WhatsApp notification.</strong> CallMeBot, which relays a
                      short summary of the enquiry to the business&rsquo;s own WhatsApp
                      number using its own WhatsApp connection. The summary contains
                      your reference, name, phone number, email address, chosen
                      service, location, contact preference, the number of files you
                      attached and a shortened version of your description. Because
                      the message is relayed over WhatsApp, it also passes through
                      WhatsApp as the delivery network. Files you attached are{" "}
                      <em>not</em> included.
                    </li>
                  ) : null}
                </ul>
                <p>
                  Those providers process the data on our instructions. Each has its own
                  privacy policy covering how they handle it.
                </p>
              </Clause>

              <Clause index={6} title="How long it is kept">
                <p>
                  Enquiries and attachments are kept for <em>{RETENTION_PERIOD}</em>.
                </p>
                <p>
                  This has not been decided yet. A retention period is a business
                  decision rather than a technical one, and it is marked here rather than
                  guessed at, because an invented period is a commitment the business
                  has not made.
                </p>
              </Clause>

              <Clause index={7} title="Who can see it">
                <p>
                  The people who answer enquiries at CHIBOY TECHNOLOGIES, and nobody
                  else — except where a provider listed above processes it on our
                  instructions in order to store or serve it.
                </p>
                <p>
                  We do not disclose enquiry details to anyone else, and we would not
                  respond to a request for them from a third party.
                </p>
              </Clause>

              <Clause index={8} title="Your choices">
                <p>
                  You can ask what we hold about you, ask for a correction, or ask for
                  your information to be deleted. Contact us using the details below and
                  we will deal with it. We cannot retrieve what was never sent, so if
                  you would rather not give a detail the form asks for, contact us
                  without it and we will work without it.
                </p>
                <p>
                  A named contact for data requests is <em>{DATA_PROTECTION_OFFICER}</em>.
                </p>
              </Clause>

              <Clause index={9} title="Security">
                <p>
                  Information submitted through these forms is sent over an encrypted
                  connection. Attachments are checked by their actual file contents
                  rather than by the filename or the type the browser claims, they are
                  stored outside the publicly served part of the site, and both forms
                  are rate limited.
                </p>
                <p>
                  No system is perfectly secure. Please do not send passwords, card
                  details or other credentials through a form or a message.
                </p>
              </Clause>

              <Clause index={10} title="Changes to this policy">
                <p>
                  If this policy changes, the updated version will be published on this
                  page. There is no separate list of changes and no notification
                  mechanism.
                </p>
              </Clause>
            </div>

            <div className="mt-14 border-t border-charcoal-200 pt-10">
              <ContactChannels heading="Contact us about your information" headingLevel="h2" />
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
      <h2 className="text-xl font-bold text-navy-900">
        <span className="mr-2 text-gold-600 tabular-nums">{index}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-4 leading-relaxed text-charcoal-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-navy-900">
        {children}
      </div>
    </section>
  );
}
