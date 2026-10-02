import { Plus } from "lucide-react";
import { faqs } from "../data/faqs";
import { Section, SectionHeading } from "./section";

export function FAQ() {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-12">
        <SectionHeading title="Questions, answered" className="lg:col-span-4" />
        <div className="divide-y divide-border border-y border-border lg:col-span-8">
          {faqs.map((faq, i) => (
            <details key={faq.question} name="lp-faq" open={i === 0} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-lg font-medium text-foreground">
                {faq.question}
                <Plus
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="max-w-[68ch] pb-6 leading-relaxed text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
