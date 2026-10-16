"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Headphones,
  HeartHandshake,
  LayoutGrid,
  Receipt,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EASE_OUT } from "../components/motion/variants";
import { HireToPayroll, PaidAndBooks, SupportWithContext, WinToDeliver } from "./handoffs";
import { InView } from "./in-view";
import { REVEAL } from "./motion";
import { Section, SectionHeading } from "./section";
import teamImage from "@/public/landing/team.webp";

type Team = { icon: LucideIcon; label: string };

type Story = {
  path: [Team, Team];
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
};

const STORIES: Story[] = [
  {
    path: [{ icon: TrendingUp, label: "Sales" }, { icon: LayoutGrid, label: "Delivery" }],
    title: "Win the deal, then start the work",
    body: "When a deal is won, the customer, the agreed work and the price carry straight into a new project.",
    bullets: ["Send the quote from the deal", "Create the project when the deal is won"],
    visual: <WinToDeliver />,
  },
  {
    path: [{ icon: Briefcase, label: "Hiring" }, { icon: Users, label: "Payroll" }],
    title: "Hire someone, then pay them",
    body: "When a candidate accepts, their details carry into onboarding, attendance and payroll.",
    bullets: ["Collect documents and bank details", "Attendance, leave and payroll from one staff list"],
    visual: <HireToPayroll />,
  },
  {
    path: [{ icon: Receipt, label: "Billing" }, { icon: BookOpen, label: "Accounts" }],
    title: "Get paid, and keep the books",
    body: "Invoice the customers your sales team already added, for work your project team already tracks.",
    bullets: ["Invoice straight from the customer’s page", "Invoices, expenses and accounts in one place"],
    visual: <PaidAndBooks />,
  },
  {
    path: [{ icon: Headphones, label: "Support" }, { icon: HeartHandshake, label: "Customer care" }],
    title: "Support with the whole account in view",
    body: "A ticket opens beside the customer’s deal, project and last invoice.",
    bullets: ["Tickets linked to the customer", "See how each customer is doing after the sale"],
    visual: <SupportWithContext />,
  },
];

export function FeatureRows() {
  const [active, setActive] = useState(0);
  const current = STORIES[active];

  function handleSelect(event: MouseEvent<HTMLButtonElement>) {
    setActive(Number(event.currentTarget.dataset.index));
  }

  // The progress bar's CSS animation is the timer: when it finishes, the next
  // story opens. It only runs while the list is on screen; hover or focus
  // pauses it, and reduced motion removes it.
  function handleAdvance() {
    setActive((value) => (value + 1) % STORIES.length);
  }

  return (
    <Section id="features">
      <SectionHeading
        title="Follow one customer through the company"
        lede="Follow one customer from sales to delivery, billing and support. Their details are typed in once and every team sees them."
      />

      <div className="mt-14 grid items-start gap-10 lg:grid-cols-12">
        <InView className="lg:col-span-5">
          <ul className="space-y-2">
            {STORIES.map((story, i) => {
              const open = i === active;
              const [from, to] = story.path;
              return (
                <li
                  key={story.title}
                  className={`rounded-3xl transition-colors duration-300 ${open ? "lp-card" : "hover:bg-(--lp-surface)/60"}`}
                >
                  <button
                    type="button"
                    data-index={i}
                    aria-expanded={open}
                    aria-controls="lp-story-panel"
                    onClick={handleSelect}
                    className="w-full px-5 pt-5 pb-4 text-left sm:px-6"
                  >
                    <span className="flex items-center gap-2 text-xs font-medium">
                      <span className="flex items-center gap-1.5 rounded-full bg-(--lp-mist) px-2.5 py-1 text-muted-foreground">
                        <from.icon className="size-3.5" aria-hidden />
                        {from.label}
                      </span>
                      <ArrowRight className="size-3.5 text-(--lp-accent)" aria-label="to" />
                      <span className="flex items-center gap-1.5 rounded-full bg-(--lp-accent-soft) px-2.5 py-1 text-(--lp-accent)">
                        <to.icon className="size-3.5" aria-hidden />
                        {to.label}
                      </span>
                    </span>
                    <span
                      className={`lp-display mt-3 block text-2xl transition-colors sm:text-3xl ${open ? "text-foreground" : "text-(--lp-dim) hover:text-foreground"}`}
                    >
                      {story.title}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key="body"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                        className="px-5 pb-5 sm:px-6"
                      >
                        <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">{story.body}</p>
                        <ul className="mt-4 space-y-2">
                          {story.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2.5 text-sm text-foreground">
                              <Check className="mt-0.5 size-4 shrink-0 text-(--lp-accent)" aria-hidden />
                              {bullet}
                            </li>
                          ))}
                        </ul>
                        <span aria-hidden className="mt-5 block h-1 overflow-hidden rounded-full bg-(--lp-rule)">
                          <span
                            onAnimationEnd={handleAdvance}
                            className="lp-story-progress block h-full origin-left rounded-full bg-(--lp-accent)"
                          />
                        </span>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </InView>

        <div id="lp-story-panel" className="relative isolate overflow-hidden rounded-3xl p-3 sm:p-8 lg:sticky lg:top-28 lg:col-span-7 lg:flex lg:h-[560px] lg:items-center">
          <Image src={teamImage} alt="" fill sizes="(min-width: 1024px) 58vw, 100vw" className="-z-10 object-cover" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.title}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={REVEAL}
              className="w-full"
            >
              {current.visual}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
