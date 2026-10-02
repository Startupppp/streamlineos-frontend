"use client";

import { useState, type ComponentType, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { EASE_OUT } from "../components/motion/variants";
import { Frame } from "./frame";
import { DeliveryScreen, FinanceScreen, PeopleScreen, SalesScreen, SupportScreen } from "./screens";
import { Section, SectionHeading } from "./section";

type Module = {
  id: string;
  label: string;
  apps: string;
  title: string;
  bullets: string[];
  shares: string;
  Screen: ComponentType;
};

const MODULES: Module[] = [
  {
    id: "sales",
    label: "Sales",
    apps: "CRM, Sales, Quotes",
    title: "Pipeline, quotes and forecast",
    bullets: [
      "Track every lead and deal by stage",
      "Send a quote from the deal it belongs to",
      "Turn a won deal into a project without retyping the customer",
    ],
    shares: "Customers with Billing and Helpdesk",
    Screen: SalesScreen,
  },
  {
    id: "delivery",
    label: "Delivery",
    apps: "Build, Timesheets",
    title: "Projects, cycles and time",
    bullets: [
      "Plan work on boards and in cycles",
      "Log time against the task it was spent on",
      "See which customer and deal a project came from",
    ],
    shares: "Projects with Sales and Finance",
    Screen: DeliveryScreen,
  },
  {
    id: "people",
    label: "People",
    apps: "HR, Recruitment, Attendance, Payroll, Performance",
    title: "Hiring, attendance and payroll",
    bullets: [
      "Move a candidate from offer to employee record",
      "Run attendance, leave and payroll from one roster",
      "Hold reviews against the same org chart",
    ],
    shares: "People with every other module",
    Screen: PeopleScreen,
  },
  {
    id: "finance",
    label: "Finance",
    apps: "Billing, Accounting",
    title: "Invoices and books",
    bullets: [
      "Invoice the customers already in your CRM",
      "Keep invoices, expenses and ledgers in one workspace",
      "Read receivables without exporting a spreadsheet",
    ],
    shares: "Customers with Sales, projects with Delivery",
    Screen: FinanceScreen,
  },
  {
    id: "support",
    label: "Support",
    apps: "Helpdesk, Customer Success",
    title: "Tickets with the account beside them",
    bullets: [
      "Answer tickets with the customer's history in view",
      "Track account health after the sale",
      "Bring in the delivery team without leaving the ticket",
    ],
    shares: "Customers with Sales and Finance",
    Screen: SupportScreen,
  },
];

export function ModuleStage() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const current = MODULES[active] ?? MODULES[0];

  function handleSelect(event: MouseEvent<HTMLButtonElement>) {
    setActive(Number(event.currentTarget.dataset.index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (active + step + MODULES.length) % MODULES.length;
    setActive(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  if (!current) return null;

  return (
    <Section id="apps">
      <SectionHeading
        title="One workspace for every team"
        lede="Five areas of the business, fourteen modules, one set of customers, projects and people underneath."
      />

      <div
        role="tablist"
        aria-label="Product areas"
        onKeyDown={handleKeyDown}
        className="mt-10 flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1 sm:w-fit"
      >
        {MODULES.map((module, i) => (
          <button
            key={module.id}
            type="button"
            role="tab"
            id={`lp-tab-${module.id}`}
            aria-selected={i === active}
            aria-controls="lp-stage"
            tabIndex={i === active ? 0 : -1}
            data-index={i}
            onClick={handleSelect}
            className={`relative shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === active ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {i === active ? (
              <motion.span
                layoutId="lp-tab-pill"
                className="absolute inset-0 rounded-lg bg-status-info-fill"
                transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
              />
            ) : null}
            <span className="relative">{module.label}</span>
          </button>
        ))}
      </div>

      <div
        id="lp-stage"
        role="tabpanel"
        aria-labelledby={`lp-tab-${current.id}`}
        className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-10"
      >
        <div className="lg:col-span-4 lg:pt-4">
          <p className="text-sm text-muted-foreground">{current.apps}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {current.title}
          </h3>
          <ul className="mt-6 space-y-3">
            {current.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-relaxed text-foreground">
                <Check className="mt-1 size-4 shrink-0 text-status-info-ink" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-border/70 pt-5 text-sm text-muted-foreground">
            Shares {current.shares.charAt(0).toLowerCase() + current.shares.slice(1)}.
          </p>
        </div>

        {/* Fixed height on desktop so switching tabs never moves the page. */}
        <div className="lg:col-span-8 lg:h-[480px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
              className="h-full"
            >
              <Frame
                crumb={current.label}
                label={`Mockup of the ${current.label} area: ${current.title.toLowerCase()}.`}
                className="h-full"
              >
                <current.Screen />
              </Frame>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
