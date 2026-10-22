import { DrawLine } from "@/features/landing/relay/components/ui/draw-line";
import { FocusText } from "@/features/landing/relay/components/ui/focus-text";
import { Reveal } from "@/features/landing/relay/components/ui/reveal";
import { TypeText } from "@/features/landing/relay/components/ui/type-text";
import type { ProofStat } from "@/features/landing/relay/data/proof";

import { CountUp } from "./count-up";
import { ProofQuote } from "./proof-quote";
import { StatVisual } from "./stat-visual";
import { PROOF_TIMING } from "./timing";

const TREND_TONE = [
  "",
  "w1024:text-foreground-muted",
  "w1024:text-foreground-muted",
] as const;

const TREND_TEXT = ["", "w768:w-35 w390:w-auto", ""] as const;

interface StatColumnProps {
  stat: ProofStat;
  dimHours: number;
  index: number;
  delay: number;
}

export const StatColumn = ({
  stat,
  dimHours,
  index,
  delay,
}: StatColumnProps) => {
  const pillAt =
    delay + PROOF_TIMING.visual + PROOF_TIMING.visualLength[stat.visual];
  const quoteAt = PROOF_TIMING.quoteStagger(index);
  const visualHeight = stat.visual === "progress" ? "w390:h-3.5" : "";

  return (
    <>
      <p className="absolute top-0 left-0 font-mono w390:static text-relay-label leading-label whitespace-nowrap text-foreground-muted">
        <TypeText delay={delay}>{stat.label}</TypeText>
      </p>
      <CountUp
        value={stat.value}
        delay={delay + PROOF_TIMING.number}
        className="absolute top-8 left-0 text-proof-stat leading-proof-stat font-semibold tracking-title whitespace-nowrap text-foreground w1024:top-7 w390:static w390:mt-2 w390:block"
      />
      <FocusText
        tag="p"
        delay={delay + PROOF_TIMING.caption}
        className="absolute top-26 left-0 w-96 font-mono text-relay-label leading-label text-foreground-muted w1024:top-23 w1024:w-69.5 w768:top-21 w768:w-54.5 w390:static w390:mt-3 w390:w-full"
      >
        {stat.caption}
      </FocusText>

      <div
        aria-hidden="true"
        className={`absolute top-37 left-0 h-14 w-96 w1024:top-39 w1024:w-69.5 w768:top-37 w768:w-54.5 w390:relative w390:top-auto w390:mt-6 w390:w-full ${visualHeight}`}
      >
        <StatVisual
          kind={stat.visual}
          dimHours={dimHours}
          delay={PROOF_TIMING.visualStagger(index)}
        />
      </div>

      
      <Reveal
        tag="p"
        delay={pillAt}
        className={`absolute top-56.5 left-0 overflow-clip rounded-proof-trend border border-proof-trend-border bg-surface-glass px-2.75 py-1.25 font-mono text-relay-label leading-label whitespace-nowrap text-accent w1024:top-59 w1024:flex w1024:h-16 w1024:w-69.5 w1024:items-center w1024:px-3.75 w1024:py-2.75 w1024:whitespace-normal ${TREND_TONE[index]} w768:top-57 w768:w-54.5 w390:static w390:mt-6 w390:w-full`}
      >
        <span className={TREND_TEXT[index]}>{stat.trend}</span>
      </Reveal>

      
      <div className="hidden w390:mt-6 w390:block">
        <DrawLine
          delay={quoteAt}
          className="h-px w-full rounded-full bg-proof-hairline"
        />
      </div>

      <DrawLine
        delay={quoteAt}
        className={`absolute top-73.25 left-0 h-0.5 w-7 rounded-full bg-proof-tick w1024:top-86.75 w768:top-90.25 w390:top-76.5 w390:left-5 ${index > 0 ? "w390:hidden" : ""}`}
      />

      <ProofQuote quote={stat.quote} delay={quoteAt} />
    </>
  );
};
