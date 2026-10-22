import { PRICING } from "@/lib/pricing";

import { SIGN_IN_HREF, TRIAL_LABEL } from "./pricing";

export const navMock = {
  brand: { name: "StreamlineOS", href: "/" },
  links: [
    {
      label: "Product",
      href: "/#product",
      code: "WF",
      note: "Trigger, condition, approval, action",
    },
    {
      label: "Pricing",
      href: "/pricing",
      code: PRICING.currency,
      note: `Free for up to ${PRICING.freeSeatLimit} people`,
    },
    {
      label: "About",
      href: "/about",
      code: "AB",
      note: "Who builds StreamlineOS, and why",
    },
    {
      label: "Contact",
      href: "/contact",
      code: "HI",
      note: "Sales, support and partnerships",
    },
  ],
  status: `${TRIAL_LABEL} trial on paid plans`,
  cta: { label: "Start free", href: SIGN_IN_HREF },
} as const;

export type NavContent = typeof navMock;
