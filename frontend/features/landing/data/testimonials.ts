export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
};

export const testimonials: Testimonial[] = [
  {
    quote:
      "StreamlineOS replaced five separate tools. HR, sales, and engineering finally speak the same language — and our weekly status meeting is gone.",
    name: "Arjun Mehta",
    role: "CTO, FinScale",
    initials: "AM",
  },
  {
    quote:
      "The sprint + CRM combo is game-changing. We track leads and sprints in the same view. Our forecasts went from guesses to numbers we trust.",
    name: "Priya Sharma",
    role: "Head of Sales, BuildBridge",
    initials: "PS",
  },
  {
    quote:
      "Payroll automation alone saved us 20+ hours per month. Setup was surprisingly easy — we were live across three branches in under a week.",
    name: "Rohit Das",
    role: "HR Director, TechNest",
    initials: "RD",
  },
  {
    quote:
      "The realtime chat is sub-100ms — faster than the chat tool we were paying $40/user for. Pinning it to the deal context changed how we run handoffs.",
    name: "Ananya Kapoor",
    role: "VP Operations, Lumen",
    initials: "AK",
  },
  {
    quote:
      "The AI scoring catches leads we used to drop on the floor. Our SDRs spend their day on the right 20% of the pipeline now.",
    name: "Vikram Reddy",
    role: "Sales Director, Cohort",
    initials: "VR",
  },
  {
    quote:
      "Multi-org support meant we onboarded three subsidiaries onto one platform without merging anything. Reporting rolls up to the parent — clean.",
    name: "Lakshmi Iyer",
    role: "CFO, Northwind Group",
    initials: "LI",
  },
];
