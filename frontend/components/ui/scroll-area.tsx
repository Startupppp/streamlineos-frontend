"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  hideScrollbar = false,
  fill = false,
  scrollbarClassName,
  viewportRef,
  viewportClassName,
  onViewportScroll,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  hideScrollbar?: boolean
  fill?: boolean
  scrollbarClassName?: string
  viewportRef?: React.Ref<HTMLDivElement>
  viewportClassName?: string
  onViewportScroll?: React.UIEventHandler<HTMLDivElement>
}) {
  const content = fill ? (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">{children}</div>
  ) : (
    children
  )

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-fill={fill ? "true" : undefined}
      className={cn("relative overflow-hidden", fill && "h-full", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        style={{ maxHeight: "inherit" }}
        onScroll={onViewportScroll}
        className={cn(
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
          "[&>div]:!block [&>div]:!min-w-0 [&>div]:!w-full",
          fill && "h-full [&>div]:min-h-full",
          hideScrollbar && "scrollbar-hide",
          viewportClassName,
        )}
      >
        {content}
      </ScrollAreaPrimitive.Viewport>
      {hideScrollbar ? null : (
        <ScrollBar className={scrollbarClassName} />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }

/** Use with `fill` on page-body / tab-content ScrollAreas that host empty states. */
export const SCROLL_AREA_PAGE_BODY_CLASS = "flex-1 min-h-0"
