import { PRICING } from "@/lib/pricing";

import { SIGN_IN_HREF, TRIAL_LABEL } from "./pricing";

/**
 * 01 Navigation — Figma 3488:21037. Copy is verbatim from the frame; `code`
 * and `note` only feed the 390 menu card (not in Figma, user-picked variant).
 */
export const navMock = {
  brand: { name: "StreamlineOS", href: "/" },
  /* Absolute so the nav works from every public page: homepage sections
     are `/#id`, the rest are their own routes. */
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
