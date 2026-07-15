import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Button variants — single source of truth, reads from CSS design tokens
   defined in globals.css. NEVER pass ad-hoc bg-* / text-* / hover:* via
   className unless you genuinely need a one-off variant. Add a new variant
   here instead — that keeps hover states correct across the app.

     default      Ink CTA       slate-900 bg, white text, subtle lift on hover
     outline      Secondary     white bg, slate-700 text, slate-50 hover
     ghost        Tertiary      transparent, slate-100 hover
     destructive  Danger        red bg
     secondary    Subtle fill   slate-100 bg
     link         Inline        theme-accent text, underline on hover
     brand        Gradient CTA  brand gradient (use sparingly — top of funnel)
   ───────────────────────────────────────────────────────────────────────── */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors press-scale disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-[0_8px_22px_-10px_rgba(11,18,32,0.35)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/30",
        outline:
          "border border-border bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-card hover:border-primary/50 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost:
          "text-foreground hover:bg-muted hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:text-primary/80 hover:underline",
        brand:
          "text-white font-semibold shadow-[0_10px_28px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_14px_34px_-10px_rgba(59,130,246,0.6)] bg-[linear-gradient(135deg,_var(--brand-deep)_0%,_var(--brand-core)_55%,_var(--brand-cyan)_100%)]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-9",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
