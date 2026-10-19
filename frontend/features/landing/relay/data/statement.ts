/** 05 Statement — Figma 3488:22124. Copy is verbatim from the frame. */
export const statementMock = {
  kicker: "[ one system. every function. ]",
  title: {
    lead: "One system instead of",
    accent: "a dozen tools",
    tail: " that never agree.",
  },
  caption: "one tick, one run",
  now: "now",
  hours: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"],
} as const;

export type StatementContent = typeof statementMock;
