import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { faqs, type FAQ as FaqItem } from "../data/faqs";
import { Section, SectionHeading } from "./section";

/** Native `<details>`: accessible and keyboard-operable with no client JavaScript. */
export function FAQ({
  items = faqs,
  title = "Questions, answered",
  children,
}: {
  items?: FaqItem[];
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <SectionHeading align="left" title={title} />
          {children}
        </div>
        <div className="space-y-3 lg:col-span-8">
          {items.map((faq, i) => (
            <details key={faq.question} name="lp-faq" open={i === 0} className="lp-card group rounded-2xl px-6">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-lg font-medium text-foreground">
                {faq.question}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--lp-mist) transition-[background-color,rotate] duration-200 group-open:rotate-45 group-open:bg-(--lp-ink) group-open:text-white">
                  <Plus className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="max-w-[68ch] pb-6 leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
