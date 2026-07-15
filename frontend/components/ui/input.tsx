import * as React from "react";

import { cn } from "../../lib/utils";
import {
  FIELD_CONTROL_CLASS,
  FIELD_CONTROL_DISABLED_CLASS,
  FIELD_CONTROL_HOVER_CLASS,
  FIELD_CONTROL_INVALID_CLASS,
} from "./field-control";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        FIELD_CONTROL_CLASS,
        "w-full min-w-0 px-3",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "selection:bg-primary selection:text-primary-foreground",
        "placeholder:text-muted-foreground",
        FIELD_CONTROL_HOVER_CLASS,
        FIELD_CONTROL_INVALID_CLASS,
        FIELD_CONTROL_DISABLED_CLASS,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
