import { ReactNode } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { LandingFooter } from "@/features/landing/landing-footer";
import { PublicMain } from "@/features/landing/components/public-main";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PublicShell({ children, className }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col surface-soft text-foreground selection:bg-status-info-surface selection:text-status-info-ink">
      <LandingNav />
      <PublicMain className={className}>{children}</PublicMain>
      <LandingFooter />
    </div>
  );
}

export { PublicEyebrow } from "@/features/landing/components/public-eyebrow";
