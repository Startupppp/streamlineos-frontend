"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_DISABLED_CLASS,
  FIELD_CONTROL_HOVER_CLASS,
  FIELD_CONTROL_INVALID_CLASS,
} from "./field-control";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("font-sans font-medium", className)}
      {...props}
    />
  );
}

/**
 * A `SelectTrigger` renders `role="combobox"`, and `combobox` is NOT a
 * name-from-content role — the `SelectValue` inside the trigger does not name
 * it. Measured in Chrome via `Accessibility.getPartialAXTree`: a bare
 * `<button role="combobox"><span>Asia/Kolkata</span></button>` computes an
 * accessible name of `""`, while the same button carrying an associated
 * `<label for>` computes `"Timezone"`. That is why axe reported `button-name`
 * on eight routes over this one primitive.
 *
 * Three mechanisms already name a trigger, and all three are honoured by
 * leaving them alone: an author's `aria-label` or `aria-labelledby`, and an
 * `id` — which `FormControl` supplies as `formItemId` while `FormLabel`
 * supplies the matching `htmlFor`, a real `<label for>` association confirmed
 * above to name a `role="combobox"` button. The fallback below covers the
 * fourth shape: a trigger whose `SelectValue` carries a `placeholder`, which
 * is the call site's own words for what the control selects and is therefore
 * a SPECIFIC name rather than a generic one.
 *
 * What this deliberately does not do is default to a constant such as
 * "Select". That would silence the automated check and leave a screen-reader
 * user with hundreds of identically-named comboboxes, which is worse than the
 * failure it hides. A trigger with no label, no `aria-label` and no
 * placeholder stays nameless on purpose and keeps failing;
 * `design-system-control-names.contract` enumerates every one of them by file
 * and line and ratchets the count.
 */
export function selectValuePlaceholderName(
  children: React.ReactNode,
): string | undefined {
  let found: string | undefined;
  const walk = (nodes: unknown, depth: number) => {
    if (found !== undefined || depth > 4) return;
    React.Children.forEach(nodes, (child: unknown) => {
      if (found !== undefined || child === null || child === undefined) return;
      if (!React.isValidElement(child)) return;
      const childProps = child.props;
      if (typeof childProps !== "object" || childProps === null) return;
      if (child.type === SelectValue || child.type === SelectPrimitive.Value) {
        const placeholder =
          "placeholder" in childProps ? childProps.placeholder : undefined;
        if (typeof placeholder === "string" && placeholder.trim())
          found = placeholder.trim();
        return;
      }
      if ("children" in childProps) walk(childProps.children, depth + 1);
    });
  };
  walk(children, 0);
  return found;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}) {
  const authoredName =
    props["aria-label"] ?? props["aria-labelledby"] ?? props.id;
  const placeholderName = authoredName
    ? undefined
    : selectValuePlaceholderName(children);

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        FIELD_CONTROL_CLASS,
        "flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-3 text-left font-sans font-medium whitespace-nowrap",
        "data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
        FIELD_CONTROL_HOVER_CLASS,
        "data-[state=open]:border-ring data-[state=open]:ring-1 data-[state=open]:ring-ring",
        FIELD_CONTROL_INVALID_CLASS,
        FIELD_CONTROL_DISABLED_CLASS,
        "data-[size=sm]:h-9",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:truncate",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
      aria-label={props["aria-label"] ?? placeholderName}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "bg-popover text-popover-foreground pointer-events-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-[110] max-h-(--radix-select-content-available-height) min-w-[10rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto scrollbar-hide rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1 min-w-[var(--radix-select-trigger-width)]",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:[&_svg:not([class*='text-'])]:text-accent-foreground text-destructive:[&_svg:not([class*='text-'])]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 font-sans text-sm font-medium text-foreground outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
