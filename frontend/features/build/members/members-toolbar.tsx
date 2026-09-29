"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { DisplayToggleRow } from "@/features/build/shared/display-toggle-row";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { SlidersHorizontalIcon } from "@animateicons/react/lucide";
import { type DisplayProps, DISPLAY_PROP_ITEMS } from "./display-props";

export function WorkspaceRoleBadge({ role }: { role: "member" | "admin" }) {
  if (role === "admin") {
    return (
      <Badge className="h-[18px] px-1.5 text-micro font-medium bg-primary/10 text-foreground border border-primary/20 hover:bg-primary/10">
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="h-[18px] px-1.5 text-micro font-medium">
      Member
    </Badge>
  );
}

export function DisplayPropsToggle({
  value,
  onChange,
}: {
  value: DisplayProps;
  onChange: (next: DisplayProps) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleToggle(key: keyof DisplayProps, checked: boolean) {
    onChange({ ...value, [key]: checked });
  }

  return (
    <ResponsivePopover>
      <MobileOnlyLabelTooltip label="Display">
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Display"
            className={cn(RESPONSIVE_ICON_LABEL_TRIGGER_CLASS, "min-h-9 shrink-0")}
            {...hoverHandlers}
          >
            <SlidersHorizontalIcon ref={iconRef} size={13} aria-hidden="true" />
            <ResponsiveIconLabelText>Display</ResponsiveIconLabelText>
          </Button>
        </ResponsivePopoverTrigger>
      </MobileOnlyLabelTooltip>
      <ResponsivePopoverContent align="end" title="Display properties" className="w-52 p-3">
        <p className="mb-3 text-label font-semibold text-foreground">
          Display properties
        </p>
        <div>
          {DISPLAY_PROP_ITEMS.map(({ key, label }) => (
            <DisplayToggleRow
              key={key}
              id={`dp-${key}`}
              label={label}
              checked={value[key]}
              onCheckedChange={(checked) => handleToggle(key, checked)}
            />
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
