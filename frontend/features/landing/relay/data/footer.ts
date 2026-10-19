import { PRICING } from "@/lib/pricing";

import { SIGN_IN_HREF, TRIAL_LABEL } from "./pricing";

const FREE = `free for up to ${PRICING.freeSeatLimit} people`;

/** 10 Footer — Figma 3888:7053. StreamlineOS copy; every link is a real route. */

export const footerMock = {
  brand: {
    name: "StreamlineOS",
    href: "/",
    tagline: "The operating system for your business.",
    socialLabel: "get in touch",
    socials: [
      { label: "hi", name: "Email hello@streamlineos.in", href: "mailto:hello@streamlineos.in" },
      { label: "sa", name: "Email sales@streamlineos.in", href: "mailto:sales@streamlineos.in" },
      { label: "go", name: "Sign in to StreamlineOS", href: SIGN_IN_HREF },
    ],
  },
  cta: {
    eyebrow: "what now",
    title: { before: "Pick the process you ", accent: "chase", after: " most." },
    copy: `Bring the one job you chase by hand every week. Build it on the free plan, or try any paid plan with a ${TRIAL_LABEL} free trial.`,
    emailLabel: "Work email",
    submit: "Start free",
    /** Where the form sends people: the app's sign-up / sign-in. */
    href: SIGN_IN_HREF,
  },
  /** `short` is the 768 / 390 copy (3876:139 / 3876:142). */
  statuses: [
    { label: FREE, short: FREE },
    {
      label: `${TRIAL_LABEL} trial on every paid plan`,
      short: `${TRIAL_LABEL} trial on paid plans`,
    },
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
        { label: "Workflows", href: "/#product" },
        { label: "Integrations", href: "/#integrations" },
        { label: "Pricing", href: "/pricing" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: "company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Blog", href: "/blogs" },
      ],
    },
    {
      title: "start",
      links: [
        { label: "Start free", href: SIGN_IN_HREF },
        { label: "Sign in", href: SIGN_IN_HREF },
        { label: "Talk to sales", href: "/contact?topic=sales" },
      ],
    },
    {
      title: "legal",
      links: [
        { label: "Privacy", href: "/legal/privacy" },
        { label: "Terms", href: "/legal/terms" },
        { label: "Security", href: "/legal/security" },
      ],
    },
  ],
  legal: {
    copyright: "2026 StreamlineOS, all rights reserved",
    origin: "streamlineos.in",
  },
} as const;

export type FooterContent = typeof footerMock;
