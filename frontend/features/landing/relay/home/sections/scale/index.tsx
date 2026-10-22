import { SectionHead } from "@/features/landing/relay/components/ui/section-head";
import type { ScaleContent } from "@/features/landing/relay/data/scale";

import { RegionsCard } from "./regions-card";
import { RuntimeCard } from "./runtime-card";

export const Scale = ({ head, runtime, regions }: ScaleContent) => (
  <section
    id="scale"
    aria-label="Reliability"
    className="[content-visibility:auto] relative h-183.5 w1024:h-214.5 w768:h-321.5 w390:h-284.5"
  >
    <SectionHead
      asideClassName="w1024:w-129! w768:w-128.5! w390:w-85!"
      {...head}
      className="absolute top-24 left-20 w-320 w1024:top-20 w1024:left-12 w1024:w-232 w768:left-10 w768:w-172 w390:top-12 w390:left-5 w390:w-87.5"
    />
    <div className="absolute top-63.5 left-20 flex gap-5 w1024:top-71.5 w1024:left-12 w1024:gap-3 w768:top-68.5 w768:left-10 w768:flex-col w390:top-62 w390:left-5">
      <RuntimeCard {...runtime} index={0} />
      <RegionsCard {...regions} index={1} />
    </div>
  </section>
);
