"use client";

import { useState, type ComponentType, type KeyboardEvent, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { EASE_OUT } from "../components/motion/variants";
import { Frame } from "./frame";
import { DeliveryScreen, FinanceScreen, PeopleScreen, SalesScreen, SupportScreen } from "./screens";
import { AREAS, MODULE_COUNT } from "./areas";
import { Section, SectionHeading } from "./section";
import valleyImage from "@/public/landing/valley.webp";

type Module = {
  id: (typeof AREAS)[number]["id"];
  label: string;
  title: string;
  bullets: string[];
  shares: string;
  Screen: ComponentType;
};

const MODULES: Module[] = [
  {
    id: "sales",
    label: "Sales",
    title: "Deals, quotes and sales forecasts",
    bullets: [
      "Track every lead and deal by stage",
      "Send a quote from the deal it belongs to",
      "Turn a won deal into a project without retyping the customer",
    ],
    shares: "Uses the same customer list as Finance and Support.",
    Screen: SalesScreen,
  },
  {
    id: "delivery",
    label: "Delivery",
    title: "Projects, tasks and timesheets",
    bullets: [
      "Plan tasks on a board, week by week",
      "Log time against the task it was spent on",
      "See which customer and deal a project came from",
    ],
    shares: "Uses the same projects as Sales and Finance.",
    Screen: DeliveryScreen,
  },
  {
    id: "people",
    label: "People",
    title: "Hiring, attendance and payroll",
    bullets: [
      "Turn an accepted offer into a new employee, with no retyping",
      "Run attendance, leave and payroll from one staff list",
      "Run performance reviews for the same teams",
    ],
    shares: "Every other team uses this same staff list.",
    Screen: PeopleScreen,
  },
  {
    id: "finance",
    label: "Finance",
    title: "Invoices and books",
    bullets: [
      "Invoice the customers already in your CRM",
      "Keep invoices, expenses and accounts in one place",
      "See who still owes you money, without a spreadsheet",
    ],
    shares: "Uses the same customers as Sales and the same projects as Delivery.",
    Screen: FinanceScreen,
  },
  {
    id: "support",
    label: "Support",
    title: "Tickets with the account beside them",
    bullets: [
      "Answer tickets with the customer’s history in view",
      "See how each customer is doing after the sale",
      "Bring in the delivery team without leaving the ticket",
    ],
    shares: "Uses the same customer list as Sales and Finance.",
    Screen: SupportScreen,
  },
];

export function ModuleStage() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const current = MODULES[active];

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

  const currentApps = AREAS.find((area) => area.id === current.id)?.apps.join(", ");

  return (
    <Section id="apps">
      <SectionHeading
        title="Every team, one workspace"
        lede={`Pick a team to see what it gets. All ${MODULE_COUNT} modules share one list of customers, projects and staff.`}
      />

      <div
        role="tablist"
        aria-label="Product areas"
        onKeyDown={handleKeyDown}
        className="mx-auto mt-10 flex max-w-full gap-1 overflow-x-auto rounded-full border border-(--lp-rule) bg-(--lp-surface) p-1 sm:w-fit"
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
            className={`relative shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              i === active ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {i === active ? (
              <motion.span
                layoutId="lp-tab-pill"
                className="absolute inset-0 rounded-full bg-(--lp-ink)"
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
        className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-10"
      >
        <div className="lg:col-span-4 lg:pt-4">
          <p className="text-sm text-muted-foreground">{currentApps}</p>
          <h3 className="lp-display mt-2 text-4xl text-foreground">{current.title}</h3>
          <ul className="mt-6 space-y-3">
            {current.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-relaxed text-foreground">
                <Check className="mt-1 size-4 shrink-0 text-(--lp-accent)" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-border/70 pt-5 text-sm text-muted-foreground">
            {current.shares}
          </p>
          <Link
            href="/signin"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-(--lp-accent)"
          >
            Start with {current.label} free
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        {/* Fixed height on desktop so switching tabs never moves the page. The
            mockup floats, centred, in the landscape. */}
        <div className="relative isolate overflow-hidden rounded-3xl p-3 sm:p-6 lg:col-span-8 lg:flex lg:h-[540px] lg:items-center">
          <Image src={valleyImage} alt="" fill sizes="(min-width: 1024px) 66vw, 100vw" className="-z-10 object-cover" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT }}
              className="w-full"
            >
              <Frame
                crumb={current.label}
                label={`Mockup of the ${current.label} area: ${current.title.toLowerCase()}.`}
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
