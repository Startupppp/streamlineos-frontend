import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WIZARD_COL_PAD } from "./constants";
import { BrandMark } from "./brand-mark";

type BrandColumnFrameProps = {
  children: ReactNode;
  atmosphere?: "default" | "centered";
  showMark?: boolean;
  className?: string;
};

export function BrandColumnFrame({
  children,
  atmosphere = "default",
  showMark = true,
  className,
}: BrandColumnFrameProps) {
  const centered = atmosphere === "centered";

  return (
    <aside
      className={cn(
        "relative hidden h-full min-h-0 w-1/2 min-w-0 shrink-0 flex-col overflow-hidden border-l border-border/60 md:flex",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.08) 1px, transparent 1px)",
          backgroundSize: centered ? "48px 48px" : "56px 56px",
          maskImage: centered
            ? "radial-gradient(ellipse at 50% 42%, black 0%, transparent 78%)"
            : "radial-gradient(ellipse at 40% 35%, black 0%, transparent 72%)",
          WebkitMaskImage: centered
            ? "radial-gradient(ellipse at 50% 42%, black 0%, transparent 78%)"
            : "radial-gradient(ellipse at 40% 35%, black 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-6 h-64 w-64 rounded-full bg-brand-bright/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-4 right-[-2rem] h-72 w-72 rounded-full bg-brand-cyan/16 blur-3xl"
        aria-hidden
      />
      {centered ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] h-56 w-56 -translate-x-1/2 rounded-full bg-brand-core/10 blur-3xl"
          aria-hidden
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 flex h-full min-h-0 min-w-0 flex-col",
          WIZARD_COL_PAD,
        )}
      >
        {showMark ? <BrandMark /> : null}
        {children}
      </div>
    </aside>
  );
}
