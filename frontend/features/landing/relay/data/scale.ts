/** 06 Scale — Figma 3488:22268. StreamlineOS platform copy; row figures are the brief's illustrative sample data. */
export const scaleMock = {
  head: {
    badge: "platform",
    title: { before: "", accent: "Boring", after: " in the ways that matter." },
    aside:
      "Access, isolation, audit, ledgers. The parts nobody demos, and the parts that decide the year.",
  },
  runtime: {
    title: "One assistant, every module",
    copy: "Ask OS works across CRM, HR, inventory and finance. It drafts the action, cites its sources and waits. Nothing is written until you confirm.",
    label: "ask os, every module",
    caption: "77 tools, 35 confirm-gated writes",
    /** Order matches the node layout (four nodes round the hub). */
    apps: [
      { code: "CR", name: "crm" },
      { code: "HR", name: "hrms" },
      { code: "IN", name: "inventory" },
      { code: "FI", name: "finance" },
    ],
  },
  regions: {
    title: "Every organisation, sealed off",
    copy: "Row-level security keeps each organisation's data apart in the database. Role-based access decides who sees what, module by module.",
    label: "one organisation, sample data",
    rows: [
      { region: "crm", city: "open pipeline", share: "87.9L" },
      { region: "hrms", city: "employees", share: "148" },
      { region: "payroll", city: "net payable", share: "62.4L" },
    ],
    footnote: "one organisation's data never reaches another's",
  },
} as const;

export type ScaleContent = typeof scaleMock;
