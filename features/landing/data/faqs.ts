export type FAQ = {
  question: string;
  answer: string;
};

export const faqs: FAQ[] = [
  {
    question: "How long does setup take?",
    answer:
      "Most teams are live in under 30 minutes. Database schema is pushed in one command, the onboarding wizard walks you through your first organization, and seed scripts populate sample data so you can explore the product before inviting your team.",
  },
  {
    question: "Can I use only the modules I need?",
    answer:
      "Yes. HR, Projects, CRM, Chat, Calendar, Analytics, Recruitment, and Marketing are all opt-in. Turn on what you need today; enable the rest from settings when you're ready. Permissions follow modules — users only see what their role unlocks.",
  },
  {
    question: "Is StreamlineOS suitable for multiple legal entities?",
    answer:
      "Built for it. Run subsidiaries or business units as isolated organizations sharing one platform. Each has its own employees, projects, pipelines, branding, and policies — with optional roll-up reporting to a parent organization.",
  },
  {
    question: "What about security and compliance?",
    answer:
      "Role-based access control, multi-factor authentication, IP allow-listing, full audit logs, encrypted secrets, and encrypted-at-rest storage. We provide the building blocks for SOC 2 and ISO 27001 readiness; certification audits sit on top of these.",
  },
  {
    question: "How does the AI work — is my data sent to OpenAI or Google?",
    answer:
      "AI features (lead scoring, smart summaries, draft generation) route through configurable providers (Google Gemini, OpenAI). Prompts are scoped to the minimum context required. You can disable AI globally or per-module from organization settings, and bring your own API key.",
  },
  {
    question: "Can we self-host?",
    answer:
      "Yes. StreamlineOS runs anywhere Node, PostgreSQL, and an S3-compatible store run. The reference deployment is Vercel + Neon + Cloudflare R2, but the stack is portable to any cloud — or to your own VPCs.",
  },
];

export { PRICING_TIERS as pricingTiers } from "@/lib/pricing";
