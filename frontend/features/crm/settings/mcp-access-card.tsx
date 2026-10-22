"use client";

import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/api/access";
import { useCrmMcpAccess, useSetCrmMcpAccess } from "@/hooks/api/crm/mcp-agent-tokens";
import { getErrorMessage } from "@/lib/get-error-message";

export function CrmMcpAccessCard() {
  const canWriteTokens = useCan("settings:api-tokens:write");
  const access = useCrmMcpAccess();
  const setAccess = useSetCrmMcpAccess();

  function handleChange(enabled: boolean) {
    setAccess.mutate(enabled, {
      onSuccess: () =>
        toast.success(
          enabled
            ? "Agents can now use the CRM tools they have permission for"
            : "Agent access to the CRM is off — existing tokens will be refused",
        ),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const enabled = access.data?.enabled === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Agent access to the CRM</CardTitle>
        <CardDescription>
          Off unless somebody here turns it on. With it off, every token below is
          refused — including ones that are valid and correctly scoped.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {access.isLoading ? (
          <Skeleton className="h-9 w-56 rounded-md" />
        ) : (
          <div className="flex items-center gap-gap-field">
            <Switch
              id="crm-mcp-access"
              checked={enabled}
              disabled={!canWriteTokens || setAccess.isPending}
              onCheckedChange={handleChange}
            />
            <Label htmlFor="crm-mcp-access" className="font-normal">
              {enabled
                ? "Agents may use the CRM tools their token allows"
                : "Agents cannot reach the CRM"}
            </Label>
          </div>
        )}

        
        <p className="mt-2 text-label text-muted-foreground">
          This does not revoke anything. Turning it back on restores every token
          below exactly as it was.
        </p>
      </CardContent>
    </Card>
  );
}
