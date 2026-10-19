import { PRICING } from "@/lib/pricing";

import { SIGN_IN_HREF, TRIAL_LABEL } from "./pricing";

const FREE = `free for up to ${PRICING.freeSeatLimit} people`;
const TRIAL = `${TRIAL_LABEL} trial on paid plans`;

/** 02 Hero — Figma 3488:21055. Copy is verbatim from the frame. */
export const heroMock = {
  chip: "one system / every function",
  title: { before: "Plan. Run. ", accent: "Scale", after: "." },
  subhead:
    "The operating system for your business: HR, payroll, CRM, inventory, finance, workflows, helpdesk and AI in one place.",
  actions: {
    primary: { label: "Start free", href: SIGN_IN_HREF },
    secondary: { label: "See a workflow run", href: "#product" },
  },
  note: `${FREE} / ${TRIAL}`,
  /** The same note as the 1024 frame breaks it (3603:2158, 380 wide, 2 lines). */
  noteLines: [`${FREE} / ${TRIAL_LABEL} trial on`, "paid plans"],
  /** …and as the 390 frame breaks it (3893:2158, 217 wide, 12px, centred). */
  noteLines390: [`${FREE} /`, TRIAL],
  window: {
    label: "StreamlineOS workflow preview",
    title: "Deals over ₹10L",
    meta: "3 steps / 1 branch",
    status: "running",
    zoom: "100%",
    tools: [
      { name: "select", icon: "/landing/relay/hero/hero-tool-select.svg" },
      { name: "add", icon: "/landing/relay/hero/hero-tool-add.svg" },
      { name: "redirect", icon: "/landing/relay/hero/hero-tool-redirect.svg" },
      { name: "code", icon: "/landing/relay/hero/hero-tool-extra.svg" },
    ],
    trigger: { title: "Deal won", source: "crm" },
    condition: { title: "Value over ₹10L", source: "condition" },
    log: { title: "Create invoice", source: "finance" },
    /** Branch labels 3685:11 / 3685:13 on the Deal won fan-out. */
    branches: { yes: "true", no: "else" },
    approval: { title: "Ask finance", source: "waiting on a yes" },
    wait: "26 min",
    runsLabel: "last runs",
    runs: [
      {
        time: "09:41:02",
        name: "deals over ₹10L",
        duration: "129 ms",
        live: true,
      },
      {
        time: "09:38:57",
        name: "leave approval",
        duration: "2.1 s",
        live: false,
      },
      {
        time: "09:31:14",
        name: "low stock reorder",
        duration: "410 ms",
        live: false,
      },
    ],
    /** Live feed — new rows reuse these in the Figma row format. */
    runPool: [
      { name: "deals over ₹10L", duration: "134 ms" },
      { name: "low stock reorder", duration: "388 ms" },
      { name: "deals over ₹10L", duration: "121 ms" },
      { name: "leave approval", duration: "1.9 s" },
      { name: "deals over ₹10L", duration: "142 ms" },
      { name: "low stock reorder", duration: "402 ms" },
    ],
    /** Seconds between consecutive live-feed timestamps, cycled. */
    runGaps: [47, 73, 38, 91, 56],
  },
} as const;

export type HeroContent = typeof heroMock;
