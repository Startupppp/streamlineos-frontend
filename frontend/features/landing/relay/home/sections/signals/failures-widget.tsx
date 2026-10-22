import Image from "next/image";

import { TypeText } from "@/features/landing/relay/components/ui/type-text";
import type { SignalsContent } from "@/features/landing/relay/data/signals";

import { CurvesChart } from "./curves-chart";
import {
  MONO_DIM,
  Widget,
  WidgetTitle,
  TYPED_CLIP,
  widgetDelay,
} from "./widget";

export const FailuresWidget = ({
  title,
  chartLabel,
  legend,
}: SignalsContent["failures"]) => (
  <Widget labelledBy="signals-failures" order={3} className="h-61 w-103.25 w1024:h-67 w1024:grow w1024:basis-0 w768:order-4 w768:h-62 w768:w-84.5 w768:grow-0 w768:basis-auto w390:hidden">
    <WidgetTitle id="signals-failures" order={3} className="top-5.75 left-5.75">
      {title}
    </WidgetTitle>
    <CurvesChart label={chartLabel} delay={widgetDelay(3) + 200} />
    <ul className="absolute top-49.25 left-5.75 flex items-center gap-5 w1024:top-49.75 w1024:flex-col w1024:items-start w1024:gap-1 w768:top-44.5">
      <li className="flex items-center gap-2">
        <Image
          src="/landing/relay/signals/signals-legend-recovered.svg"
          alt=""
          width={8}
          height={8}
          className="size-2 shrink-0"
        />
        <span className={MONO_DIM}>
          <TypeText className={TYPED_CLIP} delay={widgetDelay(3) + 500}>
            {legend.recovered}
          </TypeText>
        </span>
      </li>
      <li className="flex items-center gap-2">
        <Image
          src="/landing/relay/signals/signals-legend-failed.svg"
          alt=""
          width={8}
          height={8}
          className="size-2 shrink-0"
        />
        <span className={MONO_DIM}>
          <TypeText className={TYPED_CLIP} delay={widgetDelay(3) + 800}>
            {legend.failed}
          </TypeText>
        </span>
      </li>
    </ul>
  </Widget>
);
