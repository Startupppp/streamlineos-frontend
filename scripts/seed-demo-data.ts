export const DEMO_ORG_SLUG = "demo-streamlineos";
export const DEMO_ORG_NAME = "Demo · StreamlineOS";
export const DEMO_OWNER_EMAIL = process.env.DEMO_OWNER_EMAIL || "demo@streamlineos.in";
export const DEMO_OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || "Demo@2026!";

export interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  designation: string;
}

export const DEMO_TEAM: DemoUser[] = [
  { email: "priya.hr@demo.streamlineos.in",    firstName: "Priya",  lastName: "Rao",   role: "HR_MANAGER",      designation: "HR Manager" },
  { email: "arjun.pm@demo.streamlineos.in",    firstName: "Arjun",  lastName: "Mehta", role: "PROJECT_MANAGER", designation: "Project Manager" },
  { email: "neha.sales@demo.streamlineos.in",  firstName: "Neha",   lastName: "Iyer",  role: "SALES_REP",       designation: "Sales Executive" },
  { email: "rahul.eng@demo.streamlineos.in",   firstName: "Rahul",  lastName: "Verma", role: "MEMBER",          designation: "Software Engineer" },
  { email: "sara.design@demo.streamlineos.in", firstName: "Sara",   lastName: "Khan",  role: "MEMBER",          designation: "Product Designer" },
];

export const DEMO_LEADS = [
  { name: "Acme Logistics",   email: "ceo@acme.test",      phone: "+91 98100 11122", company: "Acme Logistics",   designation: "CEO",      status: "QUALIFIED", priority: "HOT",  source: "website",      potential: 850000 },
  { name: "Northwind Retail", email: "ops@northwind.test", phone: "+91 98100 22233", company: "Northwind Retail", designation: "COO",      status: "NEW",       priority: "WARM", source: "referral",     potential: 420000 },
  { name: "Pioneer Studios",  email: "hello@pioneer.test", phone: "+91 98100 33344", company: "Pioneer Studios",  designation: "Founder",  status: "CONTACTED", priority: "WARM", source: "social_media", potential: 280000 },
  { name: "Vista Pharma",     email: "it@vista.test",      phone: "+91 98100 44455", company: "Vista Pharma",     designation: "IT Head",  status: "QUALIFIED", priority: "HOT",  source: "campaign",     potential: 1200000 },
  { name: "Bluepeak Capital", email: "ops@bluepeak.test",  phone: "+91 98100 55566", company: "Bluepeak Capital", designation: "Director", status: "NEW",       priority: "COLD", source: "other",        potential: 95000 },
];

export const DEMO_DEALS = [
  { name: "Acme Logistics — Annual HRMS",  value:  850000, stage: "PROPOSAL",    probability: 60 },
  { name: "Vista Pharma — Enterprise Plan", value: 1200000, stage: "NEGOTIATION", probability: 75 },
  { name: "Crestpoint Foods — Annual Plan", value:  640000, stage: "WON",         probability: 100 },
  { name: "Helio Health — Pilot",           value:  180000, stage: "LOST",        probability: 0 },
];

export const DEMO_EXPENSES: Array<{
  category: string;
  amount: string;
  description: string;
  merchant: string;
  paymentMethod: string;
  status: "APPROVED" | "PENDING";
  daysAgo: number;
}> = [
  { category: "Travel",    amount: "4250.00", description: "Client visit — Mumbai",        merchant: "IndiGo",         paymentMethod: "CARD", status: "APPROVED", daysAgo: 12 },
  { category: "Software",  amount: "1799.00", description: "Design tool annual license",   merchant: "Figma",          paymentMethod: "CARD", status: "PENDING",  daysAgo: 3 },
  { category: "Meals",     amount: "780.00",  description: "Team lunch after sprint demo", merchant: "The Big Chill",  paymentMethod: "UPI",  status: "APPROVED", daysAgo: 5 },
  { category: "Equipment", amount: "2399.00", description: "Mechanical keyboard",          merchant: "Keychron India", paymentMethod: "CARD", status: "PENDING",  daysAgo: 1 },
];

export const DEMO_TICKETS: Array<{
  title: string;
  type: "EPIC" | "STORY" | "TASK" | "BUG";
  status: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}> = [
  { title: "Set up Postgres replica",                   type: "TASK", status: "IN_PROGRESS", priority: "HIGH" },
  { title: "Design onboarding empty-state",             type: "TASK", status: "TODO",        priority: "MEDIUM" },
  { title: "Wire up Stripe webhook for subscriptions",  type: "TASK", status: "REVIEW",      priority: "HIGH" },
  { title: "Fix race condition in attendance check-in", type: "BUG",  status: "TODO",        priority: "URGENT" },
  { title: "Write blog post: launch announcement",      type: "TASK", status: "DONE",        priority: "LOW" },
];

export const DEMO_CANDIDATES = [
  { firstName: "Vikram", lastName: "Joshi", email: "vikram.joshi@cand.test", currentRole: "Senior Backend Engineer", currentCompany: "Cloudops",  experienceYears: "6.5", status: "INTERVIEW" as const, skills: ["TypeScript", "Postgres", "AWS"] },
  { firstName: "Anita",  lastName: "Bhat",  email: "anita.bhat@cand.test",   currentRole: "Product Designer",        currentCompany: "Frontier",  experienceYears: "4.0", status: "SCREENING" as const, skills: ["Figma", "Prototyping", "Design Systems"] },
  { firstName: "Karan",  lastName: "Singh", email: "karan.singh@cand.test",  currentRole: "Sales Lead",              currentCompany: "Velocity",  experienceYears: "8.0", status: "OFFER"     as const, skills: ["CRM", "Pipeline Management", "SaaS"] },
];
