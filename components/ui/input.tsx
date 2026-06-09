import * as React from "react";

import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-foreground placeholder:text-slate-400 shadow-xs transition-[color,box-shadow,border-color] outline-none",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-primary selection:text-primary-foreground",
        "hover:border-slate-400",
        "focus-visible:border-blue-500 focus-visible:ring-blue-200 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        "dark:bg-input/30 dark:border-white/10",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
