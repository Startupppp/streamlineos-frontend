"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageActionPicker } from "./page-action-picker";
import type { PermDraft } from "./page-action-picker-parts";
import {
  useModuleAccessCatalog,
  useModuleMemberGrants,
  useSetModuleMemberGrants,
  type ModuleMember,
} from "@/hooks/api/module-access";

interface MemberGrantsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: string;
  member: ModuleMember | null;
  canManage: boolean;
}

export function MemberGrantsSheet({
  open,
  onOpenChange,
  moduleKey,
  member,
  canManage,
}: MemberGrantsSheetProps) {
  const membershipId = member?.membershipId ?? null;

  const catalogQuery = useModuleAccessCatalog(moduleKey, { enabled: open });
  const grantsQuery = useModuleMemberGrants(moduleKey, membershipId, {
    enabled: open && membershipId !== null,
  });
  const setGrants = useSetModuleMemberGrants(moduleKey);

  const [draft, setDraft] = useState<PermDraft>({});
  const [reason, setReason] = useState("");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setDraft({});
      setReason("");
      return;
    }
    if (grantsQuery.isLoading || initializedRef.current) return;
    initializedRef.current = true;
    const newDraft: PermDraft = {};
    for (const grant of grantsQuery.data?.grants ?? []) {
      newDraft[grant.permissionKey] = grant.scope;
    }
    setDraft(newDraft);
  }, [open, grantsQuery.isLoading, grantsQuery.data]);

  const handleDraftChange = useCallback((next: PermDraft) => setDraft(next), []);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value),
    [],
  );

  const handleSave = useCallback(() => {
    if (!member || !canManage) return;
    const items = Object.entries(draft)
      .filter(([, scope]) => scope !== "none")
      .map(([permissionKey, scope]) => ({ permissionKey, scope }));
    setGrants.mutate(
      {
        membershipId: member.membershipId,
        userId: member.userId,
        items,
        reason: reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `Custom permissions updated for ${member.displayName || member.email}`,
          );
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [member, canManage, draft, reason, setGrants, onOpenChange]);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const displayName = member?.displayName || member?.email || "Unknown user";
  const catalog = catalogQuery.data ?? [];
  const isLoading = catalogQuery.isLoading || grantsQuery.isLoading;
  const grantedCount = Object.values(draft).filter((s) => s !== "none").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <SheetTitle className="text-base">Custom permissions</SheetTitle>
              {grantedCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {grantedCount} granted
                </Badge>
              )}
            </div>
            <SheetDescription className="text-[13px]">
              {canManage
                ? `Set individual permission grants for ${displayName}. These narrow capability without assigning a role.`
                : `Viewing custom permission grants for ${displayName}.`}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : (
            <PageActionPicker
              catalog={catalog}
              draft={draft}
              onDraftChange={handleDraftChange}
              readOnly={!canManage}
            />
          )}

          {canManage && !isLoading ? (
            <div className="space-y-1.5">
              <Label htmlFor="grants-reason" className="text-[13px] font-medium">
                Reason{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="grants-reason"
                placeholder="Describe why these permissions are being granted…"
                value={reason}
                onChange={handleReasonChange}
                className="min-h-[72px] resize-none text-sm"
                maxLength={500}
              />
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="shrink-0 border-t px-6 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={setGrants.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                isPending={setGrants.isPending}
                loadingText="Saving…"
                onClick={handleSave}
                disabled={isLoading}
              >
                Save grants
              </LoadingButton>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
