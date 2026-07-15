import { Shield, Zap, Lock, Globe, Layers, Workflow, type LucideIcon } from "lucide-react";

export type Pillar = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const pillars: Pillar[] = [
  {
    icon: Shield,
    title: "Enterprise-grade security",
    description:
      "MFA, audit logs, role-based permissions, IP allow-listing, and encrypted secrets — built for the way real companies operate.",
  },
  {
    icon: Zap,
    title: "Real-time, end to end",
    description:
      "Live presence, chat, notifications, and sprint boards stay in sync across every browser tab through WebSocket-native infrastructure.",
  },
  {
    icon: Lock,
    title: "Role-based access",
    description:
      "CEO, HR, Sales, Engineering — every role sees only what they need. Permissions follow people, projects, and pipelines.",
  },
  {
    icon: Globe,
    title: "Multi-org, multi-region",
    description:
      "Run subsidiaries or business units as isolated organizations sharing one operating system. Branch and department aware.",
  },
  {
    icon: Layers,
    title: "Composable workspace",
    description:
      "Modules opt in independently. Need only HR and CRM today? Turn the rest on tomorrow without re-platforming.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description:
      "Background jobs via Inngest, scheduled cron reports, webhook dispatch, and AI-triggered actions wired throughout.",
  },
];

export const walkthroughSteps = [
  {
    eyebrow: "Hire",
    title: "Source, score, and schedule in minutes",
    description:
      "Post a role to your careers portal, ingest applications, let AI score candidates, and schedule interviews with two-way Google Calendar sync. ATS pipeline, scorecards, and offer rollout — all stitched together.",
    bullets: ["Branded careers portal", "AI scoring on apply", "Auto-scheduled interviews"],
  },
  {
    eyebrow: "Onboard",
    title: "Digital onboarding that finishes itself",
    description:
      "Multi-step wizards collect documents, IDs, and bank info. Offer letters auto-rollout, employees self-serve their first day, and access is provisioned the moment they sign.",
    bullets: ["Document collection wizard", "Offer rollout automation", "Welcome email cadence"],
  },
  {
    eyebrow: "Deliver",
    title: "Run sprints without leaving the workspace",
    description:
      "Kanban boards, sprints, epics, and time tracking live alongside HR and CRM. Velocity and work distribution surfaced for managers — not weekly Excel exports.",
    bullets: ["Drag-and-drop kanban", "Sprint velocity tracking", "Time tracked to tickets"],
  },
  {
    eyebrow: "Close",
    title: "Sales pipeline that talks to delivery",
    description:
      "Leads turn into deals, deals into projects. AI predicts win probability, suggests next actions, and drafts emails. Forecasts roll up to the CEO dashboard automatically.",
    bullets: ["AI deal prediction", "Quote-to-cash", "CEO forecast roll-up"],
  },
];
