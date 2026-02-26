
export type PersonRole = "sales_rep" | "csm" | "marketing";

export interface PersonDeal {
  company: string;
  value: number;
  stage: string;
  probability: number;
  closeDate: string;
}

export interface PersonAccount {
  name: string;
  revenue: number;
  health: "healthy" | "at_risk" | "critical";
  since: string;
  renewalDate: string;
}

export interface PersonActivity {
  type: "deal_won" | "meeting" | "proposal" | "call" | "email" | "ticket" | "escalation";
  message: string;
  time: string;
}

export interface CrmPerson {
  slug: string;
  name: string;
  initials: string;
  role: PersonRole;
  title: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  bio: string;
  stats: {
    label: string;
    value: string | number;
    trend?: { value: number; isPositive: boolean };
  }[];
  monthlyPerformance: { month: string; value: number }[];
  deals: PersonDeal[];
  accounts: PersonAccount[];
  activities: PersonActivity[];
  skills: string[];
}
const abbreviationMap: Record<string, string> = {
  "Sarah M.": "sarah-mitchell",
  "Jason L.": "jason-lee",
  "Maria K.": "maria-kim",
  "Alex P.": "alex-park",
  "Daniel C.": "daniel-chen",
  "Emma W.": "emma-watson",
  "Ryan T.": "ryan-torres",
  "Lisa H.": "lisa-huang",
};

const fullNameMap: Record<string, string> = {
  "Sarah Mitchell": "sarah-mitchell",
  "Jason Lee": "jason-lee",
  "Maria Kim": "maria-kim",
  "Alex Park": "alex-park",
  "Daniel Chen": "daniel-chen",
  "Emma Watson": "emma-watson",
  "Ryan Torres": "ryan-torres",
  "Lisa Huang": "lisa-huang",
};

export function getPersonSlug(nameOrAbbreviation: string): string | null {
  return abbreviationMap[nameOrAbbreviation] ?? fullNameMap[nameOrAbbreviation] ?? null;
}

export function getPersonBySlug(slug: string): CrmPerson | undefined {
  return crmPeople.find((p) => p.slug === slug);
}

export const crmPeople: CrmPerson[] = [
  {
    slug: "sarah-mitchell",
    name: "Sarah Mitchell",
    initials: "SM",
    role: "sales_rep",
    title: "Senior Account Executive",
    department: "Sales",
    email: "sarah.mitchell@vaivamm.com",
    phone: "+1 (415) 555-0142",
    location: "San Francisco, CA",
    joinDate: "Mar 2022",
    bio: "Top-performing AE with expertise in enterprise SaaS sales. Consistently exceeds quota with a consultative selling approach focused on long-term client relationships.",
    stats: [
      { label: "Revenue", value: "$1.28M", trend: { value: 18.2, isPositive: true } },
      { label: "Deals Won", value: 14, trend: { value: 12.0, isPositive: true } },
      { label: "Conv. Rate", value: "84.2%", trend: { value: 4.5, isPositive: true } },
      { label: "Avg Deal", value: "$91.4K", trend: { value: 7.8, isPositive: true } },
      { label: "Quota Attain.", value: "128%", trend: { value: 15.0, isPositive: true } },
      { label: "Pipeline", value: "$598K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 120000 },
      { month: "Sep", value: 185000 },
      { month: "Oct", value: 145000 },
      { month: "Nov", value: 210000 },
      { month: "Dec", value: 195000 },
      { month: "Jan", value: 220000 },
      { month: "Feb", value: 205000 },
    ],
    deals: [
      { company: "Acme Corp", value: 420000, stage: "Negotiation", probability: 85, closeDate: "Mar 10, 2026" },
      { company: "Blue Horizon", value: 178000, stage: "Negotiation", probability: 80, closeDate: "Mar 18, 2026" },
      { company: "Pinnacle Tech", value: 95000, stage: "Proposal", probability: 60, closeDate: "Apr 5, 2026" },
      { company: "Redwood Analytics", value: 67000, stage: "Discovery", probability: 30, closeDate: "Apr 22, 2026" },
    ],
    accounts: [],
    activities: [
      { type: "call", message: "Discovery call with Blue Horizon — identified $178K opportunity", time: "6h ago" },
      { type: "email", message: "Follow-up sent to Acme Corp with updated pricing", time: "8h ago" },
      { type: "meeting", message: "Demo presentation to Pinnacle Tech (5 stakeholders)", time: "1d ago" },
      { type: "proposal", message: "Sent revised proposal to Redwood Analytics", time: "2d ago" },
      { type: "deal_won", message: "Closed $145K deal with Vertex Labs", time: "3d ago" },
      { type: "call", message: "QBR prep call with Blue Horizon", time: "4d ago" },
      { type: "meeting", message: "Executive alignment meeting with Acme Corp CTO", time: "5d ago" },
    ],
    skills: ["Enterprise Sales", "Consultative Selling", "SaaS", "Contract Negotiation", "C-Suite Engagement"],
  },
  {
    slug: "jason-lee",
    name: "Jason Lee",
    initials: "JL",
    role: "sales_rep",
    title: "Account Executive",
    department: "Sales",
    email: "jason.lee@vaivamm.com",
    phone: "+1 (415) 555-0198",
    location: "San Francisco, CA",
    joinDate: "Jun 2022",
    bio: "Strategic seller with a strong technical background. Excels at complex multi-stakeholder deals and has deep expertise in the financial services vertical.",
    stats: [
      { label: "Revenue", value: "$980K", trend: { value: 14.5, isPositive: true } },
      { label: "Deals Won", value: 11, trend: { value: 10.0, isPositive: true } },
      { label: "Conv. Rate", value: "78.6%", trend: { value: 2.3, isPositive: true } },
      { label: "Avg Deal", value: "$89.1K", trend: { value: 11.2, isPositive: true } },
      { label: "Quota Attain.", value: "112%", trend: { value: 8.0, isPositive: true } },
      { label: "Pipeline", value: "$480K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 95000 },
      { month: "Sep", value: 140000 },
      { month: "Oct", value: 130000 },
      { month: "Nov", value: 165000 },
      { month: "Dec", value: 150000 },
      { month: "Jan", value: 170000 },
      { month: "Feb", value: 130000 },
    ],
    deals: [
      { company: "TechFlow Inc", value: 310000, stage: "Proposal", probability: 70, closeDate: "Mar 25, 2026" },
      { company: "FinServe Global", value: 125000, stage: "Qualified", probability: 50, closeDate: "Apr 12, 2026" },
      { company: "Atlas Digital", value: 88000, stage: "Discovery", probability: 25, closeDate: "May 1, 2026" },
    ],
    accounts: [],
    activities: [
      { type: "proposal", message: "Sent proposal to TechFlow Inc — $310K opportunity", time: "5h ago" },
      { type: "meeting", message: "QBR meeting with top accounts", time: "1d ago" },
      { type: "call", message: "Technical deep-dive with FinServe Global IT team", time: "2d ago" },
      { type: "email", message: "Sent case study to Atlas Digital", time: "3d ago" },
      { type: "deal_won", message: "Closed $92K deal with Metro Systems", time: "5d ago" },
    ],
    skills: ["Technical Sales", "Financial Services", "Solution Architecture", "Multi-threading", "POC Management"],
  },
  {
    slug: "maria-kim",
    name: "Maria Kim",
    initials: "MK",
    role: "sales_rep",
    title: "Account Executive",
    department: "Sales",
    email: "maria.kim@vaivamm.com",
    phone: "+1 (212) 555-0167",
    location: "New York, NY",
    joinDate: "Sep 2022",
    bio: "Relationship-driven seller with expertise in healthcare and life sciences. Known for building long-term partnerships and driving expansion revenue within existing accounts.",
    stats: [
      { label: "Revenue", value: "$870K", trend: { value: 22.1, isPositive: true } },
      { label: "Deals Won", value: 10, trend: { value: 15.0, isPositive: true } },
      { label: "Conv. Rate", value: "82.4%", trend: { value: 6.8, isPositive: true } },
      { label: "Avg Deal", value: "$87.0K", trend: { value: 9.5, isPositive: true } },
      { label: "Quota Attain.", value: "108%", trend: { value: 5.5, isPositive: true } },
      { label: "Pipeline", value: "$392K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 75000 },
      { month: "Sep", value: 110000 },
      { month: "Oct", value: 125000 },
      { month: "Nov", value: 140000 },
      { month: "Dec", value: 120000 },
      { month: "Jan", value: 155000 },
      { month: "Feb", value: 145000 },
    ],
    deals: [
      { company: "Global Dynamics", value: 285000, stage: "Closed Won", probability: 100, closeDate: "Feb 21, 2026" },
      { company: "MedCore Systems", value: 107000, stage: "Negotiation", probability: 75, closeDate: "Mar 8, 2026" },
    ],
    accounts: [],
    activities: [
      { type: "deal_won", message: "Closed $285K deal with Global Dynamics", time: "2h ago" },
      { type: "meeting", message: "Negotiation meeting with MedCore Systems", time: "1d ago" },
      { type: "call", message: "Expansion discussion with existing client BioGen", time: "2d ago" },
      { type: "email", message: "Sent renewal pricing to Global Dynamics", time: "3d ago" },
      { type: "proposal", message: "Updated proposal for MedCore Systems", time: "4d ago" },
    ],
    skills: ["Healthcare Sales", "Account Expansion", "Relationship Building", "Renewal Management", "Cross-sell"],
  },
  {
    slug: "alex-park",
    name: "Alex Park",
    initials: "AP",
    role: "sales_rep",
    title: "Business Development Rep",
    department: "Sales",
    email: "alex.park@vaivamm.com",
    phone: "+1 (512) 555-0134",
    location: "Austin, TX",
    joinDate: "Jan 2023",
    bio: "High-energy BDR transitioning into a closing role. Strong at outbound prospecting and pipeline generation with a focus on mid-market technology companies.",
    stats: [
      { label: "Revenue", value: "$620K", trend: { value: 8.9, isPositive: true } },
      { label: "Deals Won", value: 8, trend: { value: 6.0, isPositive: true } },
      { label: "Conv. Rate", value: "72.1%", trend: { value: 3.2, isPositive: true } },
      { label: "Avg Deal", value: "$77.5K", trend: { value: 12.3, isPositive: true } },
      { label: "Quota Attain.", value: "95%", trend: { value: 2.1, isPositive: false } },
      { label: "Pipeline", value: "$315K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 55000 },
      { month: "Sep", value: 78000 },
      { month: "Oct", value: 82000 },
      { month: "Nov", value: 105000 },
      { month: "Dec", value: 90000 },
      { month: "Jan", value: 110000 },
      { month: "Feb", value: 100000 },
    ],
    deals: [
      { company: "Nexus Systems", value: 195000, stage: "Qualified", probability: 45, closeDate: "Apr 15, 2026" },
      { company: "Spark Digital", value: 72000, stage: "Discovery", probability: 20, closeDate: "May 10, 2026" },
      { company: "Vortex Labs", value: 48000, stage: "Proposal", probability: 55, closeDate: "Mar 28, 2026" },
    ],
    accounts: [],
    activities: [
      { type: "meeting", message: "Demo scheduled with Nexus Systems", time: "3h ago" },
      { type: "call", message: "Cold call with Spark Digital — booked demo", time: "1d ago" },
      { type: "proposal", message: "Sent proposal to Vortex Labs", time: "2d ago" },
      { type: "email", message: "Outreach sequence to 12 new prospects", time: "3d ago" },
      { type: "meeting", message: "Discovery call with Nexus Systems CTO", time: "5d ago" },
    ],
    skills: ["Outbound Prospecting", "Pipeline Generation", "Mid-Market", "Cold Calling", "Demo Skills"],
  },
  {
    slug: "daniel-chen",
    name: "Daniel Chen",
    initials: "DC",
    role: "sales_rep",
    title: "Account Executive",
    department: "Sales",
    email: "daniel.chen@vaivamm.com",
    phone: "+1 (310) 555-0189",
    location: "Los Angeles, CA",
    joinDate: "Apr 2023",
    bio: "Methodical seller with a data-driven approach. Specializes in the manufacturing and logistics vertical with a talent for building ROI-focused business cases.",
    stats: [
      { label: "Revenue", value: "$540K", trend: { value: 5.2, isPositive: true } },
      { label: "Deals Won", value: 6, trend: { value: 3.0, isPositive: true } },
      { label: "Conv. Rate", value: "75.0%", trend: { value: 1.5, isPositive: true } },
      { label: "Avg Deal", value: "$90.0K", trend: { value: 14.2, isPositive: true } },
      { label: "Quota Attain.", value: "88%", trend: { value: 4.0, isPositive: false } },
      { label: "Pipeline", value: "$275K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 45000 },
      { month: "Sep", value: 62000 },
      { month: "Oct", value: 70000 },
      { month: "Nov", value: 85000 },
      { month: "Dec", value: 78000 },
      { month: "Jan", value: 95000 },
      { month: "Feb", value: 105000 },
    ],
    deals: [
      { company: "LogiPrime", value: 145000, stage: "Proposal", probability: 65, closeDate: "Mar 20, 2026" },
      { company: "FleetOps Inc", value: 88000, stage: "Negotiation", probability: 70, closeDate: "Mar 12, 2026" },
      { company: "Vertex Labs", value: 42000, stage: "Discovery", probability: 20, closeDate: "May 5, 2026" },
    ],
    accounts: [],
    activities: [
      { type: "deal_won", message: "Closed $145K deal with Vertex Labs", time: "1d ago" },
      { type: "proposal", message: "ROI analysis sent to LogiPrime", time: "2d ago" },
      { type: "meeting", message: "Negotiation meeting with FleetOps Inc", time: "3d ago" },
      { type: "call", message: "Follow-up call with LogiPrime procurement", time: "4d ago" },
      { type: "email", message: "Case study sent to FleetOps Inc", time: "5d ago" },
    ],
    skills: ["Manufacturing", "Logistics", "ROI Analysis", "Data-Driven Selling", "Business Case Development"],
  },
  {
    slug: "emma-watson",
    name: "Emma Watson",
    initials: "EW",
    role: "csm",
    title: "Senior Customer Success Manager",
    department: "Customer Success",
    email: "emma.watson@vaivamm.com",
    phone: "+1 (415) 555-0211",
    location: "San Francisco, CA",
    joinDate: "Jan 2022",
    bio: "Seasoned CSM with a proactive approach to customer health management. Drives adoption and expansion within strategic accounts while maintaining industry-leading retention rates.",
    stats: [
      { label: "Accounts", value: 24, trend: { value: 8.3, isPositive: true } },
      { label: "ARR Managed", value: "$3.8M", trend: { value: 12.5, isPositive: true } },
      { label: "NPS", value: 78, trend: { value: 5.0, isPositive: true } },
      { label: "Retention", value: "96.2%", trend: { value: 2.1, isPositive: true } },
      { label: "CSAT", value: "4.8/5", trend: { value: 3.0, isPositive: true } },
      { label: "Expansion Rev.", value: "$420K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 3200000 },
      { month: "Sep", value: 3350000 },
      { month: "Oct", value: 3400000 },
      { month: "Nov", value: 3520000 },
      { month: "Dec", value: 3600000 },
      { month: "Jan", value: 3700000 },
      { month: "Feb", value: 3800000 },
    ],
    deals: [],
    accounts: [
      { name: "Acme Corp", revenue: 1200000, health: "healthy", since: "2022", renewalDate: "Mar 15, 2026" },
      { name: "TechFlow Inc", revenue: 750000, health: "at_risk", since: "2023", renewalDate: "Mar 22, 2026" },
      { name: "Blue Horizon", revenue: 150000, health: "healthy", since: "2024", renewalDate: "Apr 18, 2026" },
      { name: "Summit Corp", revenue: 420000, health: "healthy", since: "2023", renewalDate: "Jun 1, 2026" },
      { name: "Prism Digital", revenue: 280000, health: "healthy", since: "2024", renewalDate: "Jul 15, 2026" },
    ],
    activities: [
      { type: "call", message: "QBR call with Acme Corp — discussed expansion plans", time: "1h ago" },
      { type: "call", message: "Check-in call with Blue Horizon", time: "1d ago" },
      { type: "meeting", message: "Executive business review with TechFlow Inc", time: "2d ago" },
      { type: "email", message: "Sent adoption playbook to Summit Corp", time: "3d ago" },
      { type: "escalation", message: "Managed escalation for TechFlow Inc — API migration", time: "4d ago" },
      { type: "meeting", message: "Onboarding kickoff with Prism Digital", time: "5d ago" },
    ],
    skills: ["Account Management", "Executive Relationships", "Adoption", "Renewal Strategy", "Stakeholder Mapping"],
  },
  {
    slug: "ryan-torres",
    name: "Ryan Torres",
    initials: "RT",
    role: "csm",
    title: "Customer Success Manager",
    department: "Customer Success",
    email: "ryan.torres@vaivamm.com",
    phone: "+1 (212) 555-0244",
    location: "New York, NY",
    joinDate: "May 2022",
    bio: "Technical CSM with a strong product background. Specializes in complex integrations and driving deep product adoption across enterprise accounts.",
    stats: [
      { label: "Accounts", value: 18, trend: { value: 5.0, isPositive: true } },
      { label: "ARR Managed", value: "$2.6M", trend: { value: 9.8, isPositive: true } },
      { label: "NPS", value: 71, trend: { value: 4.0, isPositive: true } },
      { label: "Retention", value: "91.4%", trend: { value: 1.2, isPositive: false } },
      { label: "CSAT", value: "4.5/5", trend: { value: 2.0, isPositive: true } },
      { label: "Expansion Rev.", value: "$310K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 2100000 },
      { month: "Sep", value: 2200000 },
      { month: "Oct", value: 2280000 },
      { month: "Nov", value: 2350000 },
      { month: "Dec", value: 2420000 },
      { month: "Jan", value: 2510000 },
      { month: "Feb", value: 2600000 },
    ],
    deals: [],
    accounts: [
      { name: "Global Dynamics", revenue: 980000, health: "healthy", since: "2021", renewalDate: "Apr 1, 2026" },
      { name: "CloudNine", revenue: 540000, health: "critical", since: "2024", renewalDate: "Jun 10, 2026" },
      { name: "Vertex Labs", revenue: 210000, health: "at_risk", since: "2023", renewalDate: "May 1, 2026" },
      { name: "DataStream", revenue: 340000, health: "healthy", since: "2022", renewalDate: "Aug 1, 2026" },
      { name: "NovaTech", revenue: 530000, health: "healthy", since: "2023", renewalDate: "Sep 15, 2026" },
    ],
    activities: [
      { type: "email", message: "Renewal proposal sent to Global Dynamics", time: "6h ago" },
      { type: "escalation", message: "Escalation from CloudNine — API latency issues", time: "8h ago" },
      { type: "call", message: "Technical review with Vertex Labs engineering team", time: "1d ago" },
      { type: "meeting", message: "Product roadmap review with DataStream", time: "2d ago" },
      { type: "ticket", message: "Resolved integration issue for NovaTech", time: "3d ago" },
    ],
    skills: ["Technical CSM", "Integrations", "Product Adoption", "Risk Management", "Technical Documentation"],
  },
  {
    slug: "lisa-huang",
    name: "Lisa Huang",
    initials: "LH",
    role: "csm",
    title: "Customer Success Manager",
    department: "Customer Success",
    email: "lisa.huang@vaivamm.com",
    phone: "+1 (512) 555-0178",
    location: "Austin, TX",
    joinDate: "Aug 2023",
    bio: "Customer-centric CSM with exceptional onboarding skills. Drives fast time-to-value for new clients and has the highest onboarding NPS on the team.",
    stats: [
      { label: "Accounts", value: 14, trend: { value: 12.0, isPositive: true } },
      { label: "ARR Managed", value: "$1.9M", trend: { value: 15.2, isPositive: true } },
      { label: "NPS", value: 82, trend: { value: 8.0, isPositive: true } },
      { label: "Retention", value: "97.1%", trend: { value: 3.5, isPositive: true } },
      { label: "CSAT", value: "4.7/5", trend: { value: 4.0, isPositive: true } },
      { label: "Expansion Rev.", value: "$185K" },
    ],
    monthlyPerformance: [
      { month: "Aug", value: 1400000 },
      { month: "Sep", value: 1480000 },
      { month: "Oct", value: 1550000 },
      { month: "Nov", value: 1620000 },
      { month: "Dec", value: 1700000 },
      { month: "Jan", value: 1800000 },
      { month: "Feb", value: 1900000 },
    ],
    deals: [],
    accounts: [
      { name: "DataPrime", revenue: 620000, health: "healthy", since: "2022", renewalDate: "May 20, 2026" },
      { name: "Skyline Corp", revenue: 380000, health: "healthy", since: "2024", renewalDate: "Jul 1, 2026" },
      { name: "BrightPath", revenue: 290000, health: "healthy", since: "2024", renewalDate: "Aug 15, 2026" },
      { name: "Forge Systems", revenue: 220000, health: "at_risk", since: "2025", renewalDate: "Oct 1, 2026" },
    ],
    activities: [
      { type: "meeting", message: "Onboarding session with new client DataPrime", time: "5h ago" },
      { type: "call", message: "30-day check-in with Skyline Corp", time: "1d ago" },
      { type: "email", message: "Sent training resources to BrightPath team", time: "2d ago" },
      { type: "meeting", message: "Adoption review with Forge Systems", time: "3d ago" },
      { type: "ticket", message: "Resolved setup issue for BrightPath", time: "4d ago" },
    ],
    skills: ["Onboarding", "Training", "Time-to-Value", "Change Management", "Customer Education"],
  },
];
