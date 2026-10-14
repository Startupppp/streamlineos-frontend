"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { REVEAL } from "./motion";
import { Assurances, Section, SectionHeading, StartLink } from "./section";
import stepsImage from "@/public/landing/steps.webp";

const RISE = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.4 },
  transition: REVEAL,
};

const STEPS = [
  {
    title: "Create your organisation",
    body: "Add your name, logo, locations and working week. The setup guide walks you through it.",
  },
  {
    title: "Turn on the modules you need",
    body: "Start with HR or CRM. Add projects, billing or helpdesk later from settings.",
  },
  {
    title: "Invite your team",
    body: "Roles decide what each person sees, so a new hire only gets the modules their job needs.",
  },
  {
    title: "Start the real work",
    body: "Run payroll, send a quote or plan a project. Every team sees the same up-to-date details.",
  },
];

export function Steps() {
  return (
    <Section>
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            align="left"
            title="From sign-up to your first payroll in four steps"
            lede="No consultants and no implementation project. Start with one module and grow into the rest."
          />
          <div className="relative mt-10 hidden aspect-square overflow-hidden rounded-3xl lg:block">
            <Image src={stepsImage} alt="A smiling woman in a blue sweater working on a laptop on a foggy hillside." fill sizes="50vw" className="object-cover object-top" />
          </div>
        </div>

        <div>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                {...RISE}
                className="lp-card flex gap-5 rounded-3xl p-6 sm:p-8"
              >
                <span className="lp-display flex size-12 shrink-0 items-center justify-center rounded-full bg-(--lp-accent-soft) text-2xl text-(--lp-accent)">
                  {i + 1}
                </span>
                <div>
                  <h3 className="lp-display text-3xl text-foreground">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
          <motion.div
            {...RISE}
            className="mt-4 flex flex-col items-start gap-5 rounded-3xl bg-foreground p-6 text-white sm:p-8"
          >
            <p className="lp-display text-3xl">Ready when you are</p>
            <StartLink tone="light" />
            <Assurances tone="light" className="justify-start" />
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
