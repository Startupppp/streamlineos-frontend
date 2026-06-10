import * as React from "react";

import { cn } from "../../lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-foreground placeholder:text-slate-400 shadow-xs transition-[color,box-shadow,border-color] outline-none",
        "hover:border-slate-400",
        "focus-visible:border-blue-500 focus-visible:ring-blue-200 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        "dark:bg-input/30 dark:border-white/10",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
