import * as React from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none",
        "hover:border-primary/40",
        "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
        "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
