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

/**
 * The door a switched-off module was missing (BUG-HRMS-016): an administrator
 * who lands on "Module not enabled" can turn it on where they stand instead of
 * hunting for Settings → Modules. A plan that does not include the module is
 * refused by the server, and that refusal is shown as-is.
 */
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
          // Read at click time, not through useSearchParams: this view renders on
          // prerendered pages too, where that hook demands a Suspense boundary.
          const from = internalPath(new URLSearchParams(window.location.search).get("from"));
          if (from) router.replace(from);
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
        You can switch it off again in Settings → Modules. Switching it off keeps its data.
      </p>
    </>
  );
}
