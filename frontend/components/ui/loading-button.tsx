"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";

type LoadingButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    isPending?: boolean;
    loadingText?: string;
  };

export function LoadingButton({
  isPending = false,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isPending} aria-busy={isPending || undefined} {...props}>
      {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {isPending && loadingText ? loadingText : children}
    </Button>
  );
}
