import { FocusText } from "@/features/landing/relay/components/ui/focus-text";
import type { SignalsContent } from "@/features/landing/relay/data/signals";

import { RingGauge } from "./ring-gauge";
import { TEXT_AFTER, Widget, WidgetTitle, widgetDelay } from "./widget";

export const HandsOffWidget = ({
  title,
  value,
  caption,
}: SignalsContent["handsOff"]) => (
  <Widget labelledBy="signals-hands-off" order={1} className="h-64 w-96 w1024:h-64.5 w1024:w-114.5 w768:order-2 w768:h-73.5 w768:w-84.5 w390:h-72.5 w390:w-87.5">
    <WidgetTitle
      id="signals-hands-off"
      order={1}
      className="top-5.75 left-6.75 w768:left-5.75 w390:top-4.75 w390:left-4.75"
    >
      {title}
    </WidgetTitle>
    <RingGauge value={value} delay={widgetDelay(1) + 200} />
    <FocusText
      delay={widgetDelay(1) + TEXT_AFTER}
      className="absolute top-52.25 left-5.75 w-84 text-center text-body leading-body text-foreground-muted w1024:w-102.5 w768:top-55.25 w768:left-20.25 w768:w-43.5 w390:left-13.5 w390:w-60"
    >
      {caption}
    </FocusText>
  </Widget>
);
