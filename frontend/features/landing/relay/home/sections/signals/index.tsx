import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { SignalsContent } from "@/features/landing/relay/data/signals";

import { FailuresWidget } from "./failures-widget";
import { HandsOffWidget } from "./hands-off-widget";
import { RegionsWidget } from "./regions-widget";
import { WaitingWidget } from "./waiting-widget";
import { WeekWidget } from "./week-widget";

export const Signals = ({
  head,
  week,
  handsOff,
  waiting,
  failures,
  regions,
}: SignalsContent) => (
  <section
    id="signals"
    aria-label="Daily view"
    className="[content-visibility:auto] relative h-193.5 w1024:h-196 w768:h-284.5 w390:h-350.25"
  >
    <SectionHead
      asideClassName="w1024:w-123.5! w768:w-125.5! w390:w-82!"
      {...head}
      className="absolute top-24 left-20 w-320 w1024:top-0 w1024:left-12 w1024:w-232 w768:top-10 w768:left-10 w768:w-172 w390:top-0 w390:left-5 w390:w-87.5"
    />
    <div className="absolute top-63.5 left-20 flex w-320 flex-col gap-5 w1024:top-51.5 w1024:left-12 w1024:w-232 w1024:gap-3 w768:top-58.5 w768:left-10 w768:w-172 w768:flex-row w768:flex-wrap w768:items-start w390:top-50 w390:left-5 w390:w-87.5 w390:flex-col">
      <div className="flex gap-5 w1024:gap-3 w768:contents">
        <WeekWidget {...week} />
        <HandsOffWidget {...handsOff} />
      </div>
      <div className="flex gap-5 w1024:gap-3 w768:contents">
        <WaitingWidget {...waiting} />
        <FailuresWidget {...failures} />
        <RegionsWidget {...regions} />
      </div>
    </div>
  </section>
);
