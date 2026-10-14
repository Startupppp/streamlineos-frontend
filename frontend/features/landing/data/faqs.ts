export type FAQ = {
  question: string;
  answer: string;
};

export const faqs: FAQ[] = [
  {
    question: "How long does setup take?",
    answer:
      "Most teams are live in under 30 minutes. A setup guide walks you through your organisation, and you can explore with sample data before you invite your team.",
  },
  {
    question: "Can I use only the modules I need?",
    answer:
      "Yes. HR, Projects, CRM, Chat, Calendar, Analytics, Recruitment, Accounting, and Support are all opt-in. Turn on what you need today; enable the rest from settings when you’re ready. Each person only sees the modules their role needs.",
  },
  {
    question: "Can we run more than one company in StreamlineOS?",
    answer:
      "Yes. Each company or branch gets its own separate space, with its own staff, projects, sales and branding. The parent company can see combined reports across all of them.",
  },
  {
    question: "What about security and compliance?",
    answer:
      "You decide who sees what, by role. Sign-in can ask for a second code, access can be limited to your office network, every change is logged, and your data is encrypted. These are the controls SOC 2 and ISO 27001 audits look for; the certifications themselves are a separate step.",
  },
  {
    question: "How does the AI work, and is my data sent to OpenAI or Google?",
    answer:
      "AI features, such as ranking your best leads, summarising long threads and drafting replies, run on Google Gemini or OpenAI, and you choose which. Only the details a task needs are sent. You can switch AI off for the whole company or for single modules, and you can use your own account with the provider.",
  },
  {
    question: "Can we self-host?",
    answer:
      "Yes. StreamlineOS can run in your own cloud account or private network as well as on our hosted service. Talk to us and we will help you plan the setup.",
  },
];

