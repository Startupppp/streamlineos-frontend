"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

/**
 * `value` used to be destructured away and never handed to the Radix root, so
 * every bar in the product rendered `data-state="indeterminate"` with no
 * `aria-valuenow` — a screen reader announced an indeterminate busy bar over a
 * figure the page shows visually. `aria-valuetext` alone does not fix that:
 * an indeterminate progressbar has no value for the text to describe.
 *
 * The accessible NAME is the caller's, because only the caller knows what is
 * progressing. A default here would be a name like "Progress", which passes an
 * automated check and tells a screen-reader user nothing — the exact shape of
 * defect this component's own suite exists to catch.
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { valueLabel?: string }
>(({ className, value, max, valueLabel, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    value={value}
    max={max}
    aria-valuetext={valueLabel ?? `${value || 0}%`}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
