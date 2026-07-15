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
        "box-border inline-flex h-9 min-h-9 w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 text-muted-foreground scrollbar-hide sm:w-fit sm:justify-center",
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
        "box-border inline-flex h-7 min-h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 text-sm font-medium leading-none transition-[color,background-color] disabled:pointer-events-none disabled:opacity-50 min-w-fit",
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
