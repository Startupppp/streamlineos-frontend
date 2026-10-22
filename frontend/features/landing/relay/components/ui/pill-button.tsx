import type { ReactNode } from "react";

import { GlassButton } from "./glass-button";
import { BrandCta } from "./brand-cta";

export interface PillButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "glass";
  size?: "md" | "lg";
  className?: string;
}

const SIZE = {
  md: "h-10 px-6 text-relay-label leading-label",
  lg: "h-12 px-6 text-body leading-body",
} as const;

export const PillButton = ({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: PillButtonProps) =>
  variant === "primary" ? (
    <BrandCta
      href={href}
      label={String(children)}
      className={`${SIZE[size]} ${className}`}
    />
  ) : (
    <GlassButton href={href} className={`${SIZE[size]} ${className}`}>
      {children}
    </GlassButton>
  );
