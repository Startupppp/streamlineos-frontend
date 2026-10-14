import type { ReactNode } from "react";
import "./home.css";
import { displaySerif } from "./fonts";
import { Navbar } from "./navbar";
import { LandingFooter } from "../landing-footer";

/** The misty marketing world shared by the home and pricing pages. */
export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`lp ${displaySerif.variable} relative flex min-h-dvh flex-col overflow-x-clip text-foreground selection:bg-(--lp-accent-soft)`}
    >
      <Navbar />
      <main className="min-w-0 flex-1">{children}</main>
      <LandingFooter />
    </div>
  );
}
