"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { Check, Plus } from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import { LeaveOrganizationMenuItem } from "@/components/organization/leave-organization-control";

const ArchivedOrgsRestore = dynamic(
  () =>
    import("@/components/organization/archived-orgs-restore").then(
      (m) => m.ArchivedOrgsRestore,
    ),
  { ssr: false },
);

/**
 * The body of the workspace switcher, split off so it loads on first open.
 *
 * Radix mounts a menu's content only while it is open, so a `next/dynamic`
 * boundary here is enough: the organisation list, the archived-org restore
 * control and the leave-organisation item stay out of every authenticated
 * route's first load until someone actually opens the switcher.
 */
export interface WorkspaceOrg {
  id: string;
  name: string;
}

export interface OrganizationSwitcherPanelProps {
  activeOrg: WorkspaceOrg | undefined;
  otherOrgs: WorkspaceOrg[];
  isPending: boolean;
  isOrgOwner: boolean;
  canLeave: boolean;
  onSwitch: (orgId: string) => void;
  onCreateWorkspace: () => void;
  onRequestLeave: () => void;
  onClose?: () => void;
  layout: "dropdown" | "drawer";
}

export function OrganizationSwitcherPanel({
  activeOrg,
  otherOrgs,
  isPending,
  isOrgOwner,
  canLeave,
  onSwitch,
  onCreateWorkspace,
  onRequestLeave,
  onClose,
  layout,
}: OrganizationSwitcherPanelProps) {
  const handleSwitch = useCallback(
    (orgId: string) => {
      onSwitch(orgId);
      onClose?.();
    },
    [onSwitch, onClose],
  );

  const handleCreate = useCallback(() => {
    onCreateWorkspace();
    onClose?.();
  }, [onCreateWorkspace, onClose]);

  const handleLeave = useCallback(() => {
    onClose?.();
    onRequestLeave();
  }, [onClose, onRequestLeave]);

  if (layout === "dropdown") {
    return (
      <>
        <div className="px-2 py-1.5">
          <p className="text-micro uppercase tracking-wider font-semibold text-foreground/70">
            Organizations
          </p>
        </div>
        <DropdownMenuItem
          className="gap-2 text-foreground data-[disabled]:opacity-100"
          disabled
        >
          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          <TruncatedText
            text={activeOrg?.name ?? ""}
            className="font-medium text-sm text-foreground"
          />
        </DropdownMenuItem>
        {otherOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {otherOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className="gap-2 cursor-pointer text-foreground"
                onClick={() => handleSwitch(org.id)}
                disabled={isPending}
              >
                <span className="h-3.5 w-3.5 shrink-0" />
                <TruncatedText
                  text={org.name}
                  className="text-sm text-foreground"
                />
              </DropdownMenuItem>
            ))}
          </>
        )}
        <ArchivedOrgsRestore variant="compact" />
        {isOrgOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-foreground/80 focus:text-foreground"
              onSelect={handleCreate}
            >
              <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
              <span className="text-sm">Create organization</span>
            </DropdownMenuItem>
          </>
        )}
        {canLeave && (
          <>
            <DropdownMenuSeparator />
            <LeaveOrganizationMenuItem
              layout="dropdown"
              canLeave={canLeave}
              onRequestLeave={handleLeave}
            />
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 pb-2">
      <div className="px-1 py-1.5">
        <p className="text-micro uppercase tracking-wider font-semibold text-foreground/70">
          Organizations
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground">
        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
        <TruncatedText
          text={activeOrg?.name ?? ""}
          className="font-medium text-foreground"
        />
      </div>
      {otherOrgs.map((org) => (
        <button
          key={org.id}
          type="button"
          disabled={isPending}
          onClick={() => handleSwitch(org.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <span className="h-3.5 w-3.5 shrink-0" />
          <TruncatedText text={org.name} className="text-foreground" />
        </button>
      ))}
      <ArchivedOrgsRestore variant="compact" className="px-0" />
      {isOrgOwner && (
        <button
          type="button"
          onClick={handleCreate}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5 shrink-0 text-foreground/70" />
          <span>Create organization</span>
        </button>
      )}
      {canLeave && (
        <LeaveOrganizationMenuItem
          layout="drawer"
          canLeave={canLeave}
          onRequestLeave={handleLeave}
        />
      )}
    </div>
  );
}
