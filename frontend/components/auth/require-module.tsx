"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAccess, useModuleEnabled } from "@/hooks/api/access";
import { normalizeOrgModuleKey } from "@/lib/org-module-keys";
import { getModuleCatalogEntry } from "@/lib/module-catalog";

interface RequireModuleProps {
  module: string;
  children: ReactNode;
}

function ModuleDisabledState({ module }: { module: string }) {
  const { label } = getModuleCatalogEntry(normalizeOrgModuleKey(module));

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[40dvh] gap-4 py-16">
      <Building2 className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="font-semibold text-foreground">
          {label} module not enabled
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Enable this module to access this section.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/modules">Manage Modules</Link>
      </Button>
    </div>
  );
}

export function RequireModule({ module, children }: RequireModuleProps) {
  const { data } = useAccess();
  const isEnabled = useModuleEnabled(module);

  if (!data) return null;
  if (!isEnabled) return <ModuleDisabledState module={module} />;
  return <>{children}</>;
}
