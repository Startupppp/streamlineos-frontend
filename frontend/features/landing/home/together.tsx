import { ArrowRight, Briefcase, Headphones, LayoutGrid, Receipt, TrendingUp, Users } from "lucide-react";
import { MotionItem, MotionStagger } from "../components/motion/motion-reveal";
import { AREAS } from "./areas";
import { VIEWPORT_EARLY } from "./motion";
import { Section, SectionHeading } from "./section";

const AREA_ICONS = { sales: TrendingUp, delivery: LayoutGrid, people: Users, finance: Receipt, support: Headphones };

/** Where each team's line leaves the row above the customer card (SVG units). */
const LINE_STARTS = [50, 150, 250, 350, 450];

const CUSTOMER_FACTS = [
  ["Deal", "Won, ₹18.4L"],
  ["Project", "46% done"],
  ["Invoice", "Due in 6 days"],
  ["Support", "1 open ticket"],
];

/** Two teams that used to hand work over by email, and what sharing one record changes for them. */
const PAIRS = [
  {
    from: { icon: TrendingUp, label: "Sales" },
    to: { icon: LayoutGrid, label: "Delivery" },
    title: "No handover meeting",
    body: "A won deal becomes a project, with the agreed work, price and contacts already filled in.",
  },
  {
    from: { icon: Briefcase, label: "Hiring" },
    to: { icon: Users, label: "Payroll" },
    title: "Typed once, at the offer",
    body: "A new hire’s details flow straight into attendance and payroll.",
  },
  {
    from: { icon: Headphones, label: "Support" },
    to: { icon: Receipt, label: "Finance" },
    title: "Answers with context",
    body: "Tickets are answered with the customer’s invoices and project in view.",
  },
];

export function Together() {
  return (
    <Section>
      <SectionHeading
        title="One platform, one team"
        lede="When every team sees the same customer details, nobody has to chase anyone for updates."
      />

      <MotionStagger viewport={VIEWPORT_EARLY} className="mt-14 grid gap-4 lg:grid-cols-5">
        <MotionItem className="flex flex-col justify-between gap-10 rounded-3xl bg-(--lp-accent-soft) p-8 sm:p-12 lg:col-span-3">
          <p className="lp-display text-balance text-3xl text-foreground sm:text-4xl">
            Ask “who is working on this customer?” and every team gives the same answer, because they are all
            looking at the same page.
          </p>
          <div>
            <ul className="grid grid-cols-5 gap-1">
              {AREAS.map((area) => {
                const Icon = AREA_ICONS[area.id];
                return (
                  <li key={area.id} className="flex flex-col items-center gap-1.5 text-xs font-medium text-foreground">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-(--lp-surface) text-(--lp-accent) shadow-sm">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {area.label}
                  </li>
                );
              })}
            </ul>
            <svg viewBox="0 0 500 64" preserveAspectRatio="none" className="h-14 w-full text-(--lp-accent)" aria-hidden>
              {LINE_STARTS.map((x) => (
                <path
                  key={x}
                  d={`M${x} 0 C ${x} 36, 250 28, 250 64`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  className="lp-flow opacity-60"
                />
              ))}
            </svg>
            <div className="mx-auto max-w-sm rounded-2xl bg-(--lp-surface) p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-foreground px-3 py-1 text-sm font-medium text-white">Kestrel Foods</span>
                <span className="text-xs text-muted-foreground">Seen by all 5 teams</span>
              </div>
              <dl className="mt-3 divide-y divide-(--lp-rule) text-sm">
                {CUSTOMER_FACTS.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-foreground tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </MotionItem>

        <ul className="grid gap-4 lg:col-span-2">
          {PAIRS.map((pair) => (
            <li key={pair.title}>
              <MotionItem className="lp-card h-full rounded-3xl p-6">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5 rounded-full bg-(--lp-mist) px-2.5 py-1">
                    <pair.from.icon className="size-3.5" aria-hidden />
                    {pair.from.label}
                  </span>
                  <ArrowRight className="size-3.5 text-(--lp-accent)" aria-label="to" />
                  <span className="flex items-center gap-1.5 rounded-full bg-(--lp-accent-soft) px-2.5 py-1 text-(--lp-accent)">
                    <pair.to.icon className="size-3.5" aria-hidden />
                    {pair.to.label}
                  </span>
                </div>
                <h3 className="lp-display mt-4 text-2xl text-foreground">{pair.title}</h3>
                <p className="mt-1.5 text-pretty leading-relaxed text-muted-foreground">{pair.body}</p>
              </MotionItem>
            </li>
          ))}
        </ul>
      </MotionStagger>
    </Section>
  );
}
