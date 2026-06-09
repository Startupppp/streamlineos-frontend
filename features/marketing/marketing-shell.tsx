import { ReactNode } from "react";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { LandingFooter } from "@/features/landing/landing-footer";

type Props = {
  children: ReactNode;
  className?: string;
};

export function MarketingShell({ children, className }: Props) {
  return (
    <div className="relative flex min-h-screen flex-col surface-soft text-slate-900 selection:bg-blue-500/20 selection:text-blue-950 overflow-x-clip">
      <LandingNav />
      <main className={`flex-1 pt-28 pb-16 lg:pt-32 lg:pb-24 ${className ?? ""}`}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

type EyebrowProps = { children: ReactNode };
export function MarketingEyebrow({ children }: EyebrowProps) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-600 mb-3">
      {children}
    </p>
  );
}
