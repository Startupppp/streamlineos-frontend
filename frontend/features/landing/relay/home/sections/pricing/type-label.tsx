import type { RefObject } from "react";

import { InviewSeen } from "@/features/landing/relay/components/ui/inview-seen";
import { TypeText, type TypeTextProps } from "@/features/landing/relay/components/ui/type-text";

const CUT = "round(down, calc(var(--typed) * 1ch + 0.5px), 1ch)";

export const TypeLabel = ({
  className = "",
  trigger,
  ...props
}: TypeTextProps & { trigger?: RefObject<HTMLElement> }) => {
  if (!trigger)
    return (
      <TypeText
        {...props}
        className={`[clip-path:inset(0_calc(100%_-_round(down,calc(var(--typed)*1ch_+_0.5px),1ch)_-_0.1ch)_0_0)]! ${className}`}
      />
    );

  const { children, tag = "span", delay = 0, per = 30 } = props;
  return (
    <InviewSeen
      tag={tag}
      mode="once"
      trigger={trigger}
      className={`relative inline-block ${className}`}
      from={{ "--typed": 0 }}
      to={{ "--typed": children.length + 0.5 }}
      config={{ duration: children.length * per }}
      delayIn={delay}
      style={{ clipPath: `inset(0 calc(100% - ${CUT} - 0.1ch) 0 0)` }}
    >
      {children}
    </InviewSeen>
  );
};
