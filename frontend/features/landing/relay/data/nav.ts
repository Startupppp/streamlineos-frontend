/**
 * 01 Navigation — Figma 3488:21037. Copy is verbatim from the frame; `code`
 * and `note` only feed the 390 menu card (not in Figma, user-picked variant).
 */
export const navMock = {
  brand: { name: "StreamlineOS", href: "/" },
  links: [
    {
      label: "Workflows",
      href: "#product",
      code: "WF",
      note: "Trigger, condition, approval, action",
    },
    {
      label: "Platform",
      href: "#scale",
      code: "PL",
      note: "Ask OS, access control, isolation",
    },
    {
      label: "Ask OS",
      href: "#proof",
      code: "AI",
      note: "It drafts, it cites, it waits",
    },
    {
      label: "Pricing",
      href: "#pricing",
      code: "₹",
      note: "Free for up to 5 people",
    },
  ],
  status: "14-day trial on paid plans",
  cta: { label: "Start free", href: "https://app.streamlineos.in" },
} as const;

export type NavContent = typeof navMock;
