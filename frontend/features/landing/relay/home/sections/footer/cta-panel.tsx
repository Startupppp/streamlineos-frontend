import type { FooterContent } from "@/features/landing/relay/data/footer";

import { CtaTitle } from "./cta-title";
import { SignupForm } from "./signup-form";
import { CUE, CueFocus, CueRise, CueType } from "./stage";

export const CtaPanel = ({
  eyebrow,
  title,
  copy,
  emailLabel,
  submit,
  href,
}: FooterContent["cta"]) => (
  <CueRise
    stage="top"
    delay={CUE.panels}
    className="absolute top-24 left-157.5 h-80 w-182.5 overflow-clip rounded-footer-panel bg-linear-135 from-brand-from to-brand-to shadow-float w1024:top-0 w1024:left-129.75 w1024:h-69.5 w1024:w-114.25 w768:top-82.5 w768:left-10 w768:w-172 w390:top-80.25 w390:left-5 w390:h-85 w390:w-87.5"
  >
    <p className="absolute top-10 left-10 font-mono text-relay-label leading-label whitespace-nowrap text-footer-ink-eyebrow w1024:top-6 w1024:left-6 w390:left-5">
      <CueType stage="top" delay={CUE.title}>
        {eyebrow}
      </CueType>
    </p>
    <CtaTitle title={title} delay={CUE.title} />
    <CueFocus
      stage="top"
      delay={CUE.copy}
      className="absolute top-34 left-10 w-162.5 text-body leading-body text-footer-ink-copy w1024:top-30.5 w1024:left-6 w1024:w-102.25 w768:top-31.5 w768:w-108 w390:top-40 w390:left-5 w390:w-77.5"
    >
      {copy}
    </CueFocus>
    <CueRise
      stage="top"
      delay={CUE.form}
      className="absolute top-57 left-10 w1024:top-49.5 w1024:left-6 w390:top-65 w390:left-5"
    >
      <SignupForm emailLabel={emailLabel} submit={submit} href={href} />
    </CueRise>
  </CueRise>
);
