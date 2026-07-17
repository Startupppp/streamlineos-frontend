import type { ReactNode } from "react";
import { HrProvider } from "@/features/hr/shared/hr-context";
import { HrPathTracker } from "@/features/hr/shared/hr-path-tracker";

/**
 * HR module layout — premium canvas with soft brand wash so every HRMS
 * surface feels cohesive, calm, and elevated. Wraps children in HrProvider
 * so directory/bulk-import UI state is shared across routes.
 */
export default function HrLayout({ children }: { children: ReactNode }) {
  return (
    <HrProvider>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          {/* Soft brand wash — keep light, never muddy */}
          <div className="absolute -top-32 left-[-10%] h-[28rem] w-[36rem] rounded-full bg-sky-300/[0.12] blur-3xl dark:bg-sky-400/[0.05]" />
          <div className="absolute top-1/3 right-[-8%] h-72 w-96 rounded-full bg-blue-200/[0.14] blur-3xl dark:bg-blue-400/[0.04]" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-[28rem] rounded-full bg-indigo-200/[0.10] blur-3xl dark:bg-indigo-400/[0.03]" />
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 20%, transparent 75%)",
            }}
          />
        </div>
        <HrPathTracker />
        {children}
      </div>
    </HrProvider>
  );
}
