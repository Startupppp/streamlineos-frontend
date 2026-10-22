"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useToggleOrgModule } from "@/hooks/api/access/org-modules";
import { getErrorMessage } from "@/lib/get-error-message";

interface EnableModuleButtonProps {
  moduleKey: string;
  moduleName: string;
  compact?: boolean;
}

function internalPath(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export function EnableModuleButton(props: EnableModuleButtonProps) {
  const canManage = useCan("settings:manage");
  return canManage ? <EnableModuleControl {...props} /> : null;
}

function EnableModuleControl({ moduleKey, moduleName, compact }: EnableModuleButtonProps) {
  const toggle = useToggleOrgModule();
  const router = useRouter();

  const enable = () =>
    toggle.mutate(
      { moduleKey, enabled: true },
      {
        onSuccess: () => {
          toast.success(`${moduleName} enabled`);
          const from = internalPath(new URLSearchParams(window.location.search).get("from"));
          if (from) window.location.assign(from);
          else router.refresh();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  return (
    <>
      <Button size={compact ? "sm" : "default"} onClick={enable} disabled={toggle.isPending}>
        {toggle.isPending ? "Enabling…" : `Enable ${moduleName}`}
      </Button>
      <p className="max-w-xs text-xs text-muted-foreground">
        Turning a module on does not change your bill. You can switch it off again in Settings → Modules; switching it off keeps its data.
      </p>
    </>
  );
}
