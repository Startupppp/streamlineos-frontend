import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { FAQ } from "@/features/landing/data/faqs";

interface FaqProps {
  faqs: readonly FAQ[];
}

export const Faq = ({ faqs }: FaqProps) => (
  <section
    id="faq"
    aria-label="Frequently asked questions"
    className="relative flex flex-col gap-12 px-page-inset w1024:gap-10 w390:gap-8"
  >
    <SectionHead
      badge="faq"
      title={{ before: "Questions, ", accent: "answered", after: "." }}
      aside="What teams ask before they move HR, sales, delivery and finance onto one system."
    />
    <ul className="flex flex-col gap-3">
      {faqs.map((faq) => (
        <li key={faq.question}>
          <details className="group rounded-2xl border border-border-subtle bg-card-glass backdrop-blur-card transition-colors duration-(--motion-fast) ease-entrance open:border-border-glass">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-lead leading-lead font-medium text-foreground marker:hidden w390:px-4 w390:py-4 w390:text-body w390:leading-body [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span
                aria-hidden="true"
                className="relative size-4 shrink-0 text-accent transition-transform duration-(--motion-fast) ease-entrance group-open:rotate-45"
              >
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
              </span>
            </summary>
            <p className="max-w-190 px-6 pb-6 text-body leading-body text-foreground-muted w390:px-4 w390:pb-4">
              {faq.answer}
            </p>
          </details>
        </li>
      ))}
    </ul>
  </section>
);
