"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentProps,
} from "react";

import { Inview } from "@/features/landing/relay/components/common/robot-inview";
import { useSeen } from "@/features/landing/relay/hooks/use-seen";

type InviewProps = ComponentProps<typeof Inview>;

export const InviewSeen = forwardRef<HTMLElement, InviewProps>(
  ({ enabled = true, trigger, ...props }, ref) => {
    const local = useRef<HTMLElement>(null);
    useImperativeHandle(ref, () => local.current as HTMLElement);
    const seen = useSeen(trigger ?? local);
    return (
      <Inview
        {...props}
        trigger={trigger}
        ref={local}
        enabled={enabled && seen}
      />
    );
  },
);
InviewSeen.displayName = "InviewSeen";
