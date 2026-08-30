import type { ReactNode } from "react";
import { HrProvider } from "@/features/hr/shared/hr-context";
import { HrPathTracker } from "@/features/hr/shared/hr-path-tracker";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export default async function HrLayout({ children }: { children: ReactNode }) {
  await enforceRouteAccess("/hr");

  return (
    <HrProvider>
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-32 left-[-10%] h-[28rem] w-[36rem] rounded-full bg-sky-300/[0.12] blur-3xl dark:bg-sky-400/[0.05]" />
          <div className="absolute top-1/3 right-[-8%] h-72 w-96 rounded-full bg-blue-200/[0.14] blur-3xl dark:bg-blue-400/[0.04]" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-[28rem] rounded-full bg-blue-200/[0.10] blur-3xl dark:bg-blue-400/[0.03]" />
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
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden [&>:first-child]:h-full [&>:first-child]:min-h-0 [&>:first-child]:flex-1">
          {children}
        </div>
      </div>
    </HrProvider>
  );
}

