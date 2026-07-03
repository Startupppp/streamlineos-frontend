"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEnabledModules } from "@/hooks/api/access/org-modules";

interface RequireModuleProps {
  module: string;
  children: ReactNode;
}

function ModuleDisabledState({ module }: { module: string }) {
  const label = module.charAt(0).toUpperCase() + module.slice(1).toLowerCase();
  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[40vh] gap-4 py-16">
      <Building2 className="h-10 w-10 text-muted-foreground/40" />
      <div className="text-center">
        <p className="font-semibold text-foreground">{label} module not enabled</p>
        <p className="text-sm text-muted-foreground mt-1">Enable this module to access this section.</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/modules">Manage Modules</Link>
      </Button>
    </div>
  );
}

export function RequireModule({ module, children }: RequireModuleProps) {
  const enabledModules = useEnabledModules();
  const upperModule = module.toUpperCase();
  const isEnabled = enabledModules.length === 0 || enabledModules.some((m) => m.toUpperCase() === upperModule);
  if (!isEnabled) {
    return <ModuleDisabledState module={module} />;
  }
  return <>{children}</>;
}
