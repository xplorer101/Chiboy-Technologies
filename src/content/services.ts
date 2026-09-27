import { z } from "zod";

/**
 * Service catalogue.
 *
 * This file is the single source of truth for services. Adding a seventh
 * service means adding one object to `services` below — no new page component,
 * no new route file, no duplicated markup. The overview page, the homepage
 * preview, the six detail pages, the service request dropdown, the sitemap and
 * the navigation are all derived from this array.
 *
 * Each entry is validated at module load by `serviceSchema`, so a typo fails
 * the build rather than rendering a broken page.
 */

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

/**
 * Icon names are stored as strings rather than components so this file stays
 * plain, serialisable data. `ServiceIcon` maps them to Lucide components.
 */
export const serviceIconNames = [
  "wrench",
  "package",
  "network",
  "palette",
  "store",
  "lightbulb",
] as const;

export type ServiceIconName = (typeof serviceIconNames)[number];

const serviceSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase and hyphenated"),
  name: z.string().min(1),
  /** One-line summary used on cards and in the request form dropdown. */
  cardDescription: z.string().min(1),
  /** Opening paragraph on the detail page. */
  intro: z.string().min(1),
  icon: z.enum(serviceIconNames),

  meta: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),

  /** "Problems it solves" — the visitor's symptoms, in their language. */
  problems: z.array(z.string().min(1)).min(1),
  /** "What's included" — the scope of the work. */
  included: z.array(z.string().min(1)).min(1),

  /**
   * Slugs of portfolio projects shown on this page. Entries reference slugs
   * rather than ids so the catalogue stays a static, reviewable data file; the
   * page resolves them and degrades gracefully if a project is missing.
   */
  relatedProjectSlugs: z.array(z.string().min(1)).default([]),

  faqs: z.array(faqSchema).min(1),
});

export type Service = z.infer<typeof serviceSchema>;

const rawServices = [
  {
    slug: "software-maintenance",
    name: "Software Maintenance",
    cardDescription:
      "Computer software troubleshooting, optimization, configuration and maintenance",
    intro:
      "Software that has not been maintained tends to get slower, less reliable and harder to use. We keep computer software running properly — resolving faults, tuning performance, correcting configuration and carrying out the routine upkeep that prevents small problems from becoming large ones.",
    icon: "wrench",
    meta: {
      title: "Software Maintenance & Troubleshooting",
      description:
        "Computer software troubleshooting, optimisation, configuration and ongoing maintenance to keep your systems running reliably.",
    },
    problems: [
      "Software has become slow, unresponsive or prone to freezing and crashing",
      "Error messages appear on start-up, during use, or when installing updates",
      "A machine takes a long time to boot or open applications",
      "Updates keep failing or leave the system in an inconsistent state",
      "Storage space has run out and the cause is unclear",
      "Software behaves differently on a work machine than it used to",
      "A business application needs reconfiguring after staff or process changes",
    ],
    included: [
      "Diagnosis of the underlying fault, not just the visible symptom",
      "Performance tuning of the operating system and installed applications",
      "Startup and background items reviewed and corrected",
      "System and application updates applied safely, with a restore point first",
      "Disk cleanup, storage analysis and junk removal",
      "Driver and software configuration corrections",
      "Removal of conflicting, duplicated or malicious software",
      "Health check with a written summary of findings and recommendations",
    ],
    relatedProjectSlugs: ["placeholder-software-maintenance"],
    faqs: [
      {
        question: "How do you diagnose a software problem?",
        answer:
          "We start by establishing what changed and when the problem started, then examine the system directly — logs, installed software, configuration and resource use. This is faster and more reliable than replacing software that was not the actual cause.",
      },
      {
        question: "Will you lose my data or files?",
        answer:
          "Backups are taken before any change that carries risk. We do not delete personal or business files as part of routine maintenance, and anything we do remove is agreed with you first.",
      },
      {
        question: "Do you work on both Windows and macOS?",
        answer:
          "Yes. We support both platforms. If a problem is specific to one operating system, we will tell you before starting.",
      },
      {
        question: "Do I need to bring the computer to you?",
        answer:
          "It depends on the work and on your location. Submit a service request with your location and a description of the problem and we will confirm the most practical option.",
      },
      {
        question: "Is ongoing maintenance necessary?",
        answer:
          "Regular maintenance is significantly cheaper and faster than recovering from a failure. It also keeps performance predictable as more software and data are added over time.",
      },
    ],
  },
  {
    slug: "software-installation",
    name: "Software Installation",
    cardDescription:
      "Installation and configuration of operating systems, applications, drivers and other software",
    intro:
      "Getting new software installed correctly is more than copying files onto a machine. We install and configure operating systems, applications, drivers and supporting software properly — licensed, up to date, configured for how you actually work, and tested before we hand it back.",
    icon: "package",
    meta: {
      title: "Software Installation & Configuration",
      description:
        "Installation and configuration of operating systems, applications, drivers and other software, set up correctly and tested.",
    },
    problems: [
      "A new computer arrives with no operating system, or with unwanted pre-installed software",
      "Software purchased online needs to be downloaded, installed and licensed",
      "Drivers are missing, so hardware such as printers, scanners or graphics cards will not work",
      "A fresh machine needs to be prepared for work before it is useful",
      "Software installed incorrectly and will not run or keeps failing to update",
      "A business application needs to connect to a server, network or email",
      "Antivirus or security software is blocking legitimate applications",
    ],
    included: [
      "Operating system installation and initial configuration",
      "Application installation, licensing and activation",
      "Essential driver installation for printers, scanners and other hardware",
      "Removal of bundled trial software and bloatware",
      "Operating system, browser and application updates applied",
      "Configuration of user accounts, security and preferences",
      "Email, network and printer setup where required",
      "Testing to confirm everything launches and works as expected",
    ],
    relatedProjectSlugs: ["placeholder-software-installation"],
    faqs: [
      {
        question: "Do you supply the software licence?",
        answer:
          "It depends on the product. We will tell you what needs to be purchased and where, and we can handle the purchase, installation and activation for you. Licensing terms are set by the software vendor, not by us.",
      },
      {
        question: "Can you set up a brand new computer?",
        answer:
          "Yes. New machine setup is one of our core services: operating system, drivers, updates, your software, security, and configuration so it is ready to use.",
      },
      {
        question: "Will my existing files be preserved?",
        answer:
          "Yes, where the work allows it. If a full reinstallation would overwrite data, we will say so in advance and make sure everything is backed up or transferred first.",
      },
      {
        question: "How long does an installation take?",
        answer:
          "It depends on what is being installed. A straightforward application setup is quick; a full operating system installation with all software and configuration takes considerably longer. We will confirm a timescale with you.",
      },
      {
        question: "Can you install software from a USB stick or download?",
        answer:
          "Yes. We can install from a supplier USB, a download, or a disc. We will also check the licence requirements before installing.",
      },
    ],
  },
  {
    slug: "networking",
    name: "Networking",
    cardDescription:
      "Network setup, configuration, troubleshooting and connectivity solutions",
    intro:
      "A network that is unreliable costs more than the equipment used to build it. We set up, configure and troubleshoot wired and wireless networks for homes and small offices — from a single router to a multi-device setup with shared storage, printers and user access controls.",
    icon: "network",
    meta: {
      title: "Networking & Network Setup",
      description:
        "Network setup, configuration, troubleshooting and connectivity solutions for homes and businesses.",
    },
    problems: [
      "Wi-Fi is slow, drops out, or does not reach every part of the building",
      "Some devices connect to the network while others cannot",
      "A shared printer or storage is not visible on the network",
      "The network is slow at busy times even though the internet connection is fine",
      "Devices need to be kept separate from guests, staff or other systems",
      "A new office or home needs a network built from scratch",
      "A router or switch has been replaced and the configuration was lost",
    ],
    included: [
      "Site assessment and survey of coverage requirements",
      "Router, switch and access point installation and configuration",
      "Wireless network setup with sensible SSID, password and channel choice",
      "Wired network configuration and cable testing where required",
      "Network sharing for printers, storage and shared files",
      "Device and user access control, including guest network separation",
      "Network performance and connectivity troubleshooting",
      "Documentation of the setup, including passwords and addresses",
    ],
    relatedProjectSlugs: ["placeholder-networking"],
    faqs: [
      {
        question: "Do I need new equipment to improve my Wi-Fi?",
        answer:
          "Not always. Coverage problems are frequently caused by placement or configuration of existing equipment. We assess first and only recommend hardware where it will genuinely make a difference.",
      },
      {
        question: "Can you set up a network for a small office?",
        answer:
          "Yes. We configure wired and wireless networks with shared printing, shared storage and separate guest access, sized to the number of users and devices.",
      },
      {
        question: "Is my data at risk during the work?",
        answer:
          "Work is carried out without exposing or altering your data. Any configuration change that would briefly interrupt connectivity is done at a time agreed with you.",
      },
      {
        question: "Do you supply routers and access points?",
        answer:
          "We can advise on and supply appropriate equipment, or install equipment you have already purchased. We will explain the trade-offs before recommending anything.",
      },
      {
        question: "What does 'network setup' include?",
        answer:
          "At minimum: a correctly configured router or access point, a secured wireless network, working connectivity on your devices, and written details of the configuration so you can manage it later.",
      },
    ],
  },
  {
    slug: "graphics-design",
    name: "Graphics Design",
    cardDescription:
      "Professional visual designs for businesses, brands, advertising and digital communication",
    intro:
      "Graphics design covers everything from a logo that has to work at any size to the artwork behind a social post or a printed banner. We produce clean, professional visual assets for businesses, brands, advertising and digital communication — designed to be legible, consistent and usable in the places they will actually appear.",
    icon: "palette",
    meta: {
      title: "Graphics Design",
      description:
        "Professional visual design for businesses, brands, advertising and digital communication.",
    },
    problems: [
      "The business needs a logo or visual identity but has nothing usable",
      "Existing materials look inconsistent across social media, print and documents",
      "Marketing material is needed for an event, product or campaign",
      "An existing design does not scale well — it is unreadable small or pixelated large",
      "Brand colours and fonts are not defined, so every design looks different",
      "Artwork is required for signage, banners, flyers, menus or business cards",
      "Files are needed in specific formats for print or for a supplier",
    ],
    included: [
      "Logo and visual identity design, including colour and typeface selection",
      "Brand guidelines so future designs stay consistent",
      "Marketing collateral: flyers, posters, leaflets, banners and social media graphics",
      "Business documents: letterheads, business cards, invoices and presentations",
      "Product, packaging and signage artwork",
      "Design adapted for the formats required, including print-ready files",
      "Source files and exported images supplied in the formats you need",
      "Reasonable revisions until the design is right",
    ],
    relatedProjectSlugs: ["placeholder-graphics-design"],
    faqs: [
      {
        question: "What do I receive at the end of a design project?",
        answer:
          "The final artwork in the formats you need for your intended use, plus the editable source files. For a logo, that normally includes files suitable for print, for screens and for social media.",
      },
      {
        question: "How many revisions are included?",
        answer:
          "Reasonable revisions are included as part of the agreed work, so the design can be refined until it meets the requirement. The exact scope is confirmed before we start.",
      },
      {
        question: "Can you work from an existing logo or brand?",
        answer:
          "Yes. We can extend an existing identity, redesign it, or produce new materials that match it. Send whatever you currently use and we will advise on the best approach.",
      },
      {
        question: "Do you design for print as well as screens?",
        answer:
          "Yes. Print work is prepared with the correct resolution, colour profile and bleed, and we will tell you what to give your printer.",
      },
      {
        question: "How long does a design take?",
        answer:
          "It depends on scope. A single item is quicker than a full identity. We agree a timescale with you before starting, and we will tell you if something needs to change.",
      },
    ],
  },
  {
    slug: "sales",
    name: "Technology Sales",
    cardDescription:
      "Sales of computers, software and related technology products",
    intro:
      "We supply computers, software and related technology products, matched to what you actually need rather than to whatever is largest or newest on the shelf. We take the time to understand the workload first, so the specification you buy is one that will still be appropriate in a year's time.",
    icon: "store",
    meta: {
      title: "Computer, Software & Technology Sales",
      description:
        "Sales of computers, software and related technology products, specified to fit your actual requirements.",
    },
    problems: [
      "A replacement computer is needed and the options are hard to compare",
      "Specifications quoted by different sellers are not directly comparable",
      "A business needs a consistent, repeatable specification across several machines",
      "A laptop has to survive travel, or a desktop has to fit a specific space",
      "Software needs purchasing, licensing and installing",
      "Peripherals, networking equipment or accessories are needed alongside a purchase",
      "The wrong product was bought previously and does not meet the requirement",
    ],
    included: [
      "Requirement discussion covering workload, software and budget",
      "Specification recommendation with the reasoning explained",
      "Supply of computers, laptops and related hardware",
      "Supply and licensing of software",
      "Networking equipment and accessories where required",
      "Comparison of available options against your specific needs",
      "Delivery, setup and configuration so the product is usable from the start",
      "After-sales support and help with any issues that follow the purchase",
    ],
    relatedProjectSlugs: ["placeholder-technology-sales"],
    faqs: [
      {
        question: "How do I know which computer I need?",
        answer:
          "Tell us what the machine will actually be used for and we will recommend a specification to match. This is more reliable than comparing processor speeds and memory numbers across different brands.",
      },
      {
        question: "Can you supply a specific brand or model?",
        answer:
          "Yes, if it suits the requirement. We will tell you honestly if a specification would better meet your needs, but we are happy to supply what you ask for.",
      },
      {
        question: "Do you deliver and set up the equipment?",
        answer:
          "Yes. Delivery, setup and configuration are part of the job, so the machine works properly from the moment you receive it rather than needing a separate visit.",
      },
      {
        question: "What happens if something goes wrong with a purchase?",
        answer:
          "We will help you through the supplier's warranty process and, where required, arrange repair or replacement. You are not left to deal with it on your own.",
      },
      {
        question: "Can you supply for a whole office?",
        answer:
          "Yes. We can specify and supply a consistent set of machines and peripherals, and arrange configuration so they behave predictably across the team.",
      },
    ],
  },
  {
    slug: "consultancy",
    name: "IT Consultancy",
    cardDescription:
      "Technology advice and practical solutions tailored to individual and business requirements",
    intro:
      "Sometimes the most valuable thing is knowing what you should not do. Our IT consultancy gives independent, practical advice on what technology a business or individual should have, what should change, and what can safely be left alone — grounded in the six services we actually deliver rather than in products we need to sell.",
    icon: "lightbulb",
    meta: {
      title: "IT Consultancy",
      description:
        "Technology advice and practical solutions tailored to individual and business requirements.",
    },
    problems: [
      "Technology decisions need a second opinion before money is committed",
      "Existing equipment or software is being considered for replacement and it is unclear whether that is necessary",
      "A growing business needs a plan for systems, data and connectivity",
      "Costs are unclear and there is no visibility of what is being spent on technology",
      "Security and data protection need to be taken seriously but are being handled ad hoc",
      "A previous installation did not solve the problem and the approach needs reviewing",
      "It is unclear whether the current setup can support a planned change",
    ],
    included: [
      "Assessment of the current systems, software and infrastructure",
      "Written advice and recommendations you can act on",
      "Guidance on suitable hardware, software and services for your needs",
      "Advice on data backup, storage, security and continuity",
      "Review of an existing supplier's work or quotation",
      "Planning and budgeting for technology changes",
      "Coordination of implementation, whether delivered by us or a third party",
      "A follow-up review to confirm the advice was implemented correctly",
    ],
    relatedProjectSlugs: ["placeholder-it-consultancy"],
    faqs: [
      {
        question: "Are you independent of suppliers?",
        answer:
          "We are not tied to a single vendor, so our advice is based on your requirement. Where a supplier's product is genuinely the best fit we will say so, and where it is not we will explain why.",
      },
      {
        question: "Can you review another company's work?",
        answer:
          "Yes. An assessment of an existing installation or a quotation from another supplier is a normal request and often prevents an expensive mistake.",
      },
      {
        question: "What does a consultancy engagement involve?",
        answer:
          "A discussion of your requirements, an assessment of what you currently have, and practical written recommendations. We will agree the scope with you before beginning.",
      },
      {
        question: "Do you implement the changes you recommend?",
        answer:
          "Where the work falls within our services, yes. We can also advise on and coordinate work carried out by others, so you have one point of contact.",
      },
      {
        question: "Is consultancy worth it if nothing is broken?",
        answer:
          "Frequently, yes. A review before a purchase or a change is far cheaper than correcting a poor decision afterwards, and it often reveals problems that were not yet visible.",
      },
    ],
  },
] satisfies Service[];

/** Validated at load time: a malformed entry fails the build, not production. */
export const services: Service[] = z.array(serviceSchema).parse(rawServices);

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function isServiceSlug(value: string): value is Service["slug"] {
  return services.some((service) => service.slug === value);
}

/**
 * The "Service Required" dropdown offers the six services plus an explicit
 * "Other" option, per the service request specification.
 */
export const OTHER_SERVICE_OPTION = "other" as const;

export const serviceRequestOptions = [
  ...services.map((service) => ({ value: service.slug, label: service.name })),
  { value: OTHER_SERVICE_OPTION, label: "Other" },
] as const;
