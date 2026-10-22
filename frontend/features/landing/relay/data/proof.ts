export const proofMock = {
  badge: "ask os",
  title: {
    before: "Numbers from the ",
    accent: "code",
    after: ", not a survey.",
  },
  aside:
    "Counted from the product itself, not from customers. What Ask OS can reach, and where it stops to ask you first.",
  stats: [
    {
      id: "tools",
      label: "reach",
      value: "77",
      caption: "tools Ask OS can call across every module",
      visual: "sparkline",
      trend: "up to 16 tool calls per turn",
      quote: {
        text: "One question can reach payroll, the pipeline and stock, with every claim cited and every gap flagged.",
        name: "Executive Brief",
        role: "ask os, for leadership",
      },
    },
    {
      id: "confirm",
      label: "confirm first",
      value: "35",
      caption: "writes that wait for you to say go",
      visual: "hours",
      trend: "nothing is created until you confirm",
      quote: {
        text: "It drafts the action and tells you so: confirm to actually add it, nothing is created yet.",
        name: "Confirm-gated writes",
        role: "35 of 77 tools",
      },
    },
    {
      id: "window",
      label: "proposal window",
      value: "120 s",
      caption: "before an unconfirmed proposal expires",
      visual: "progress",
      trend: "every proposal is HMAC-signed",
      quote: {
        text: "It drafts. It cites. It waits for you to say go.",
        name: "Ask OS",
        role: "cross-module assistant",
      },
    },
  ],
  dimHours: 3,
} as const;

export type ProofContent = typeof proofMock;
export type ProofStat = ProofContent["stats"][number];
