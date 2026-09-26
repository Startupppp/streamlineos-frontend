"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import type { OrgMember } from "@/hooks/api/organization";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getUserDisplayName } from "@/lib/person-display";
import {
  useKbPageGrants,
  useCreateKbPageGrant,
  useRevokeKbPageGrant,
} from "@/hooks/api/kb/page-grants";
import type { KbPageGrant } from "@/hooks/api/kb/page-grants";
import {
  KbUsersIcon,
  KbTrash2Icon,
  KbXIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

const ACCESS_OPTIONS: Array<{ value: "view" | "comment" | "edit"; label: string }> = [
  { value: "view", label: "View" },
  { value: "comment", label: "Comment" },
  { value: "edit", label: "Edit" },
];

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Owner" },
  { value: "ORG_ADMIN", label: "Org Admin" },
  { value: "MEMBER", label: "Member" },
];

type GrantMode = "member" | "role";

interface PageGrantsSheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GrantsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

function AccessBadge({ access }: { access: KbPageGrant["access"] }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs",
        access === "edit" && "bg-status-info-surface text-status-info-ink border-status-info-rule",
        access === "comment" && "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
      )}
    >
      {access}
    </Badge>
  );
}

interface GrantRowProps {
  grant: KbPageGrant;
  displayName: string;
  canRevoke: boolean;
  onRevokeRequest: (grant: KbPageGrant) => void;
}

function GrantRow({ grant, displayName, canRevoke, onRevokeRequest }: GrantRowProps) {
  function handleRevokeClick() {
    onRevokeRequest(grant);
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <KbUsersIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
        {displayName}
      </span>
      <AccessBadge access={grant.access} />
      <span className="text-micro text-muted-foreground hidden sm:block">
        {kbFormatDate(grant.createdAt)}
      </span>
      {canRevoke && (
        <button
          type="button"
          aria-label={`Revoke access for ${displayName}`}
          onClick={handleRevokeClick}
          className="ml-1 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
        >
          <KbTrash2Icon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function PageGrantsSheet({
  pageId,
  open,
  onOpenChange,
}: PageGrantsSheetProps) {
  const canUpdate = useCan("kb:pages:update");

  const { data, isLoading, isError, error, refetch } = useKbPageGrants(pageId);
  const grants = useMemo(() => data?.data ?? [], [data]);

  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && grants.length === 0,
  });

  const createGrant = useCreateKbPageGrant();
  const revokeGrant = useRevokeKbPageGrant();

  const [grantMode, setGrantMode] = useState<GrantMode>("member");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedAccess, setSelectedAccess] = useState<"view" | "comment" | "edit">("view");
  const [revokeTarget, setRevokeTarget] = useState<KbPageGrant | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(memberSearch, 300);
  const { data: membersData } = useOrgMembers(1, 20, debouncedSearch || undefined, {
    enabled: canUpdate && memberPickerOpen,
    staleTime: 30_000,
  });
  const memberOptions = membersData?.data ?? [];

  function resolveGrantLabel(grant: KbPageGrant): string {
    if (grant.role !== null) return formatRoleLabel(grant.role);
    if (grant.granteeName != null) return grant.granteeName;
    return "Team member";
  }

  function handleModeChange(mode: GrantMode) {
    setGrantMode(mode);
    setSelectedMember(null);
    setSelectedRole("");
    setMemberSearch("");
  }

  function handleModeToMember() {
    handleModeChange("member");
  }

  function handleModeToRole() {
    handleModeChange("role");
  }

  function handleMemberSelect(member: OrgMember) {
    setSelectedMember(member);
    setMemberSearch("");
    setMemberPickerOpen(false);
  }

  function handleMemberClear() {
    setSelectedMember(null);
  }

  function handleRoleChange(value: string) {
    setSelectedRole(value);
  }

  function handleAccessChange(value: string) {
    setSelectedAccess(value as "view" | "comment" | "edit");
  }

  function handleMemberSearchChange(value: string) {
    setMemberSearch(value);
  }

  function handleMemberPickerOpenChange(open: boolean) {
    setMemberPickerOpen(open);
  }

  const canSubmit =
    selectedAccess !== undefined &&
    (grantMode === "member" ? selectedMember !== null : selectedRole !== "");

  function handleSubmitGrant() {
    if (!canSubmit) return;
    if (grantMode === "member" && selectedMember !== null) {
      createGrant.mutate(
        { pageId, membershipId: selectedMember.membershipId, access: selectedAccess },
        {
          onSuccess: () => {
            toast.success("Access granted");
            setSelectedMember(null);
            setMemberSearch("");
            setSelectedAccess("view");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else if (grantMode === "role" && selectedRole !== "") {
      createGrant.mutate(
        { pageId, role: selectedRole, access: selectedAccess },
        {
          onSuccess: () => {
            toast.success("Access granted");
            setSelectedRole("");
            setSelectedAccess("view");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  const handleRevokeRequest = useCallback((grant: KbPageGrant) => {
    setRevokeTarget(grant);
  }, []);

  function handleRevokeConfirm() {
    if (!revokeTarget) return;
    revokeGrant.mutate(
      { pageId, grantId: revokeTarget.id },
      {
        onSuccess: () => {
          toast.success("Access revoked");
          setRevokeTarget(null);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setRevokeTarget(null);
        },
      },
    );
  }

  function handleRevokeDialogOpenChange(open: boolean) {
    if (!open) setRevokeTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col p-0 gap-0 sm:max-w-md w-full">
          <SheetHeader className="shrink-0 px-5 pt-4 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">Manage access</SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              {canUpdate
                ? "Control who can view, comment on, or edit this page."
                : "People and roles with direct access to this page."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-4">
              <PageState
                resolution={pageState}
                onRetry={handleRetry}
                compact
                loading={<GrantsSkeleton />}
                empty={
                  <EmptyState
                    title="No shared access"
                    description="This page has not been shared with specific people or roles yet."
                    compact
                  />
                }
              >
                <div className="space-y-2">
                  {grants.map((grant) => (
                    <GrantRow
                      key={grant.id}
                      grant={grant}
                      displayName={resolveGrantLabel(grant)}
                      canRevoke={canUpdate}
                      onRevokeRequest={handleRevokeRequest}
                    />
                  ))}
                </div>
              </PageState>
            </div>
          </ScrollArea>

          {canUpdate && (
            <div className="shrink-0 border-t px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleModeToMember}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
                    grantMode === "member"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  By member
                </button>
                <button
                  type="button"
                  onClick={handleModeToRole}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors border",
                    grantMode === "role"
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  By role
                </button>
              </div>

              {grantMode === "member" && (
                <div className="space-y-2">
                  {selectedMember === null ? (
                    <div className="relative">
                      <Command
                        className="rounded-md border border-input"
                        shouldFilter={false}
                      >
                        <CommandInput
                          placeholder="Search members…"
                          value={memberSearch}
                          onValueChange={handleMemberSearchChange}
                          onFocus={() => handleMemberPickerOpenChange(true)}
                          onBlur={() => handleMemberPickerOpenChange(false)}
                        />
                        {memberPickerOpen && (
                          <CommandList className="max-h-40">
                            <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
                              No members found.
                            </CommandEmpty>
                            {memberOptions.map((m) => (
                              <CommandItem
                                key={m.userId}
                                value={m.userId}
                                onMouseDown={(e) => e.preventDefault()}
                                onSelect={() => handleMemberSelect(m)}
                                className="cursor-pointer"
                              >
                                <span className="text-sm">{getUserDisplayName(m)}</span>
                                <span className="ml-1.5 text-xs text-muted-foreground truncate">
                                  {m.email}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandList>
                        )}
                      </Command>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 bg-muted/40">
                      <span className="min-w-0 flex-1 text-sm truncate">
                        {getUserDisplayName(selectedMember)}
                      </span>
                      <button
                        type="button"
                        aria-label="Clear member selection"
                        onClick={handleMemberClear}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <KbXIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {grantMode === "role" && (
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue placeholder="Select role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
                <Select value={selectedAccess} onValueChange={handleAccessChange}>
                  <SelectTrigger className="h-9 text-sm flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <LoadingButton
                  onClick={handleSubmitGrant}
                  disabled={!canSubmit}
                  isPending={createGrant.isPending}
                  loadingText="Granting…"
                  className="h-9"
                >
                  Grant access
                </LoadingButton>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={handleRevokeDialogOpenChange}
        title="Revoke access?"
        description={
          revokeTarget
            ? `Remove ${resolveGrantLabel(revokeTarget)}'s access to this page.`
            : ""
        }
        destructive
        confirmLabel="Revoke"
        isPending={revokeGrant.isPending}
        onConfirm={handleRevokeConfirm}
      />
    </>
  );
}
