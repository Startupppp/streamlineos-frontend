import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { MotionReveal } from "../components/motion/motion-reveal";
import { HireToPayroll, PaidAndBooks, SupportWithContext, WinToDeliver } from "./handoffs";
import { Section, SectionHeading } from "./section";

type Story = {
  path: [string, string];
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
};

const STORIES: Story[] = [
  {
    path: ["Sales", "Delivery"],
    title: "Win the deal, then start the work",
    body: "The customer, the scope and the value move from the quote into the project. Nobody rebuilds the brief from an email thread.",
    bullets: [
      "Quote from the deal record",
      "Create the project when the deal is won",
      "Delivery sees what was sold",
    ],
    visual: <WinToDeliver />,
  },
  {
    path: ["Recruitment", "Payroll"],
    title: "Hire someone, then run payroll for them",
    body: "A candidate who accepts becomes an employee record. Onboarding, attendance, leave and payroll all read that one record.",
    bullets: [
      "Post roles, score candidates, schedule interviews",
      "Collect documents and bank details during onboarding",
      "Attendance, leave and payroll on one roster",
    ],
    visual: <HireToPayroll />,
  },
  {
    path: ["Billing", "Accounting"],
    title: "Get paid, and keep the books",
    body: "Invoices go to the customers sales already knows, for the projects delivery already runs. The ledger sits in the same workspace.",
    bullets: [
      "Invoice from the customer record",
      "Compare hours logged with hours budgeted",
      "Invoices, expenses and journals together",
    ],
    visual: <PaidAndBooks />,
  },
  {
    path: ["Helpdesk", "Customer Success"],
    title: "Support with the whole account in view",
    body: "A ticket opens next to the customer's deal, project and last invoice, so the first reply already knows the history.",
    bullets: [
      "Tickets linked to the customer record",
      "Deal, project and invoice beside the conversation",
      "Account health tracked after the sale",
    ],
    visual: <SupportWithContext />,
  },
];

function FeatureRow({ story, flip }: { story: Story; flip: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
      <div className={`lg:col-span-5 ${flip ? "lg:order-2" : ""}`}>
        <p className="flex items-center gap-2 text-sm font-medium text-status-info-ink">
          {story.path[0]}
          <ArrowRight className="size-3.5" aria-label="to" />
          {story.path[1]}
        </p>
        <h3 className="mt-4 text-balance text-[clamp(1.6rem,2.6vw,2.25rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">
          {story.title}
        </h3>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">{story.body}</p>
        <ul className="mt-7 space-y-3">
          {story.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-foreground">
              <Check className="mt-1 size-4 shrink-0 text-status-info-ink" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
      <MotionReveal className="lg:col-span-7">{story.visual}</MotionReveal>
    </div>
  );
}

export function FeatureRows() {
  return (
    <Section id="features">
      <SectionHeading
        title="Follow one customer through the company"
        lede="The same record moves from sales to delivery to finance to support. Watch for the highlighted name."
      />
      <div className="mt-16 space-y-24 sm:mt-24 sm:space-y-36">
        {STORIES.map((story, i) => (
          <FeatureRow key={story.title} story={story} flip={i % 2 === 1} />
        ))}
      </div>
    </Section>
  );
}
