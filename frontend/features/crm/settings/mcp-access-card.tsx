"use client";

import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCan } from "@/hooks/api/access";
import { useCrmMcpAccess, useSetCrmMcpAccess } from "@/hooks/api/crm/mcp-agent-tokens";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * The one control on this page that is not about a credential.
 *
 * Every other switch and key here answers "may this caller run this tool". This
 * answers whether the organisation wants a machine touching its customer
 * records at all — and no permission can express that, because an admin holds
 * `crm:deals:read` because they read deals, not because they consented to an
 * agent reading them.
 *
 * It sits above the tokens rather than beside them because it vetoes all of
 * them: a token minted while this is off is a credential that works nowhere,
 * and finding that out after issuing one is a bad first five minutes.
 */
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

        {/*
          Said explicitly, because the alternative is an operator turning this
          off and assuming the tokens are gone. They are not — they are refused,
          and revoking them is a separate act with a separate consequence.
        */}
        <p className="mt-2 text-label text-muted-foreground">
          This does not revoke anything. Turning it back on restores every token
          below exactly as it was.
        </p>
      </CardContent>
    </Card>
  );
}
