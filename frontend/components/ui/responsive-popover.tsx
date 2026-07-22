"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsivePopoverContextValue {
  isMobile: boolean;
}

const ResponsivePopoverContext =
  React.createContext<ResponsivePopoverContextValue | null>(null);

function useResponsivePopoverContext(): ResponsivePopoverContextValue {
  const ctx = React.useContext(ResponsivePopoverContext);
  if (!ctx) {
    throw new Error(
      "ResponsivePopoverTrigger and ResponsivePopoverContent must be used within ResponsivePopover",
    );
  }
  return ctx;
}

interface ResponsivePopoverProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

function ResponsivePopover({
  children,
  open,
  defaultOpen,
  onOpenChange,
  modal,
}: ResponsivePopoverProps) {
  const isMobile = useIsMobile();
  const value = React.useMemo(() => ({ isMobile }), [isMobile]);

  if (isMobile) {
    return (
      <ResponsivePopoverContext.Provider value={value}>
        <Drawer
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          shouldScaleBackground={false}
        >
          {children}
        </Drawer>
      </ResponsivePopoverContext.Provider>
    );
  }

  return (
    <ResponsivePopoverContext.Provider value={value}>
      <Popover
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal={modal}
      >
        {children}
      </Popover>
    </ResponsivePopoverContext.Provider>
  );
}

function ResponsivePopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  const { isMobile } = useResponsivePopoverContext();
  if (isMobile) {
    return <DrawerTrigger {...props} />;
  }
  return <PopoverTrigger {...props} />;
}

interface ResponsivePopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  title?: string;
  drawerClassName?: string;
}

const ResponsivePopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  ResponsivePopoverContentProps
>(function ResponsivePopoverContent(
  {
    className,
    title = "Options",
    drawerClassName,
    children,
    align = "center",
    sideOffset = 4,
    ...props
  },
  ref,
) {
  const { isMobile } = useResponsivePopoverContext();

  if (isMobile) {
    return (
      <DrawerContent
        overlayClassName="z-[110]"
        className={cn(
          "z-[110] flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden rounded-t-xl border border-border bg-popover p-0 text-popover-foreground shadow-lg",
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          "motion-reduce:transition-none",
          "[&>[data-slot=drawer-handle]]:mt-2 [&>[data-slot=drawer-handle]]:mb-1 [&>[data-slot=drawer-handle]]:h-1.5 [&>[data-slot=drawer-handle]]:w-10 [&>[data-slot=drawer-handle]]:bg-muted-foreground/25",
          drawerClassName,
        )}
      >
        <DrawerHeader className="sr-only">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            className,
            "w-full max-w-none",
          )}
        >
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <PopoverContent
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={className}
      {...props}
    >
      {children}
    </PopoverContent>
  );
});

export {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
};
