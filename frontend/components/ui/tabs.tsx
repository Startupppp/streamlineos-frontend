"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";

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
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "box-border inline-flex h-9 min-h-9 w-full flex-nowrap items-stretch justify-center gap-0.5 rounded-lg border border-border bg-card p-0.5 text-muted-foreground sm:w-fit",
        className
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
        "box-border inline-flex h-8 min-h-8 shrink-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-0 text-xs font-medium leading-none whitespace-nowrap transition-[color,background-color] disabled:pointer-events-none disabled:opacity-50 sm:flex-initial sm:px-3 sm:text-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 min-w-fit",
        "text-muted-foreground hover:text-foreground",
        "data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...props}
    />
  );
}

/** Page-body tab panels: stretch to fill remaining height under tabs/toolbars. */
export const TABS_CONTENT_PAGE_BODY_CLASS =
  "mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden";

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
