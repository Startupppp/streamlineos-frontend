import type { ProofStat } from "@/features/landing/relay/data/proof";

import { HourBars } from "./hour-bars";
import { ProgressRun } from "./progress-run";
import { Sparkline } from "./sparkline";

interface StatVisualProps {
  kind: ProofStat["visual"];
  dimHours: number;
  delay: number;
}

const DIM_HOUR_LEFT = [
  "left-77 w1024:left-55.5 w768:left-43.5 w390:left-[calc(var(--spacing)*61.7692)]",
  "left-84 w1024:left-60.5 w768:left-47.5 w390:left-[calc(var(--spacing)*67.3846)]",
  "left-91 w1024:left-65.5 w768:left-51.5 w390:left-73",
] as const;

export const StatVisual = ({ kind, dimHours, delay }: StatVisualProps) => {
  if (kind === "sparkline") return <Sparkline delay={delay} />;

  if (kind === "hours") {
    return (
      <>
        <HourBars delay={delay} />
        {DIM_HOUR_LEFT.slice(0, dimHours).map((left) => (
          <span
            key={left}
            className={`absolute top-5.5 h-8.5 w-5 rounded-proof-hour bg-proof-hour-dim w1024:w-4 w768:w-3 w390:w-4.5 ${left}`}
          />
        ))}
      </>
    );
  }

  return <ProgressRun delay={delay} />;
};
