/** 10 Footer — Figma 3888:7053. StreamlineOS copy and contact links. */
const APP_URL = "https://app.streamlineos.in";

export const footerMock = {
  brand: {
    name: "StreamlineOS",
    href: "/",
    tagline: "The operating system for your business.",
    socialLabel: "get in touch",
    socials: [
      { label: "hi", name: "Email hello@streamlineos.in", href: "mailto:hello@streamlineos.in" },
      { label: "sa", name: "Email sales@streamlineos.in", href: "mailto:sales@streamlineos.in" },
      { label: "go", name: "Sign in to StreamlineOS", href: APP_URL },
    ],
  },
  cta: {
    eyebrow: "what now",
    title: { before: "Pick the process you ", accent: "chase", after: " most." },
    copy: "Bring the one job you chase by hand every week. Build it on the free plan, or try any paid plan free for 14 days.",
    emailLabel: "Work email",
    submit: "Start free",
    /** Where the form sends people: the app's sign-up / sign-in. */
    href: APP_URL,
  },
  /** `short` is the 768 / 390 copy (3876:139 / 3876:142). */
  statuses: [
    { label: "free for up to 5 people", short: "free for up to 5 people" },
    { label: "14-day trial on every paid plan", short: "14-day trial on paid plans" },
    {
      label: "built in India, priced in INR",
      short: "built in India, priced in INR",
    },
  ],
  company: {
    name: "StreamlineOS",
    copy: "One system instead of a dozen disconnected tools.",
    compliance: "RBAC / row-level security / audit log / MFA",
  },
  columns: [
    {
      title: "product",
      links: [
        { label: "Workflows", href: "#product" },
        { label: "Integrations", href: "#integrations" },
        { label: "Ask OS", href: "#proof" },
        { label: "Pricing", href: "#pricing" },
      ],
    },
    {
      title: "platform",
      links: [
        { label: "Access control", href: "#scale" },
        { label: "Daily view", href: "#signals" },
      ],
    },
    {
      title: "start",
      links: [
        { label: "Start free", href: APP_URL },
        { label: "Sign in", href: APP_URL },
      ],
    },
    {
      title: "contact",
      links: [
        { label: "Hello", href: "mailto:hello@streamlineos.in" },
        { label: "Sales", href: "mailto:sales@streamlineos.in" },
      ],
    },
  ],
  legal: {
    copyright: "2026 StreamlineOS, all rights reserved",
    origin: "streamlineos.in",
  },
} as const;

export type FooterContent = typeof footerMock;
