import type { ReactNode } from "react";

import { Reveal } from "@/features/landing/relay/components/ui/reveal";
import { TypeText } from "@/features/landing/relay/components/ui/type-text";
import { REVEAL, STEP } from "@/features/landing/relay/lib/motion";

export interface WidgetProps {
  labelledBy: string;
  order: number;
  className: string;
  children: ReactNode;
}

export const widgetDelay = (order: number) => (order + 2) * REVEAL.step;

export const Widget = ({
  labelledBy,
  order,
  className,
  children,
}: WidgetProps) => (
  <Reveal
    tag="article"
    aria-labelledby={labelledBy}
    delay={widgetDelay(order)}
    className={`relative shrink-0 overflow-clip rounded-signals-widget border border-signals-widget-border bg-signals-widget ${className}`}
  >
    {children}
  </Reveal>
);

export const TITLE_AFTER = 150;
export const TEXT_AFTER = TITLE_AFTER + STEP;

export const MONO_DIM =
  "font-mono text-relay-label leading-label whitespace-nowrap text-foreground-dim";

export const TYPED_CLIP =
  "[clip-path:inset(0_calc(100%_-_round(down,calc(var(--typed)*1ch_+_0.5px),1ch)_-_0.1ch)_0_0)]!";

export const WidgetTitle = ({
  id,
  order,
  className,
  children,
}: {
  id: string;
  order: number;
  className: string;
  children: string;
}) => (
  <h3 id={id} className={`absolute ${className} ${MONO_DIM}`}>
    <TypeText className={TYPED_CLIP} delay={widgetDelay(order) + TITLE_AFTER}>
      {children}
    </TypeText>
  </h3>
);
