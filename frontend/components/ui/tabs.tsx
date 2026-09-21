"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";
import { OVERFLOW_EDGE_FADE_CLASS, useHorizontalOverflow } from "@/hooks/common/use-horizontal-overflow";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const overflow = useHorizontalOverflow(listRef, props.children);
  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-hidden-left={overflow.hiddenLeft}
      data-hidden-right={overflow.hiddenRight}
      className={cn(
        // Spans the row up to `md` so triggers share it equally; sizes to its
        // own tabs from `md` up. Never hardcode a width at a call site — that
        // is what crushes triggers into each other.
        "box-border flex h-9 min-h-9 w-full md:w-fit min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-card p-1 text-muted-foreground scrollbar-hide",
        OVERFLOW_EDGE_FADE_CLASS,
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // `flex-1` splits the list evenly; `min-w-fit` floors every trigger at
        // its own label width, so a long label is never squashed — once the
        // labels outgrow the list it scrolls instead.
        "box-border inline-flex h-7 min-h-7 flex-1 min-w-fit items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 text-sm font-medium leading-none transition-[color,background-color] disabled:pointer-events-none disabled:opacity-50",
        "text-muted-foreground hover:text-foreground",
        "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export const TABS_CONTENT_PAGE_BODY_CLASS =
  "mt-0 min-h-0 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col";

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        // Only apply flex when active — unconditional `flex` can override the
        // HTML `hidden` attribute and stack inactive panels under the tab list.
        "min-h-0 outline-none data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
