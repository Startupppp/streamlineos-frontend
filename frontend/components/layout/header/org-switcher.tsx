"use client";

import { useCallback, useState } from "react";
import { ChevronsUpDown, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useGetOrganizations, useSwitchOrg } from "@/hooks/common/auth-hooks";
import { useAccess } from "@/hooks/api/access";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  CreateWorkspaceDialog,
  LeaveOrganizationDialog,
  OrganizationSwitcherPanel,
} from "@/components/layout/header/org-switcher-lazy";

interface OrganizationSwitcherProps {
  variant?: "header" | "sidebar";
  iconOnly?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerOnly?: boolean;
  onRequestOpen?: () => void;
  drawerOnly?: boolean;
}

function OrganizationSwitcher({
  variant = "header",
  iconOnly = false,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerOnly = false,
  onRequestOpen,
  drawerOnly = false,
}: OrganizationSwitcherProps) {
  const { data: session } = useSession();
  const { data: access } = useAccess();
  const switchOrg = useSwitchOrg();
  const requestLeave = useNavigationLeave();
  const [createOpen, setCreateOpen] = useState(false);
  const [createMounted, setCreateMounted] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveMounted, setLeaveMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  // Load memberships with the application shell so the active organization is
  // available on first paint. Opening the switcher should never be the fetch trigger.
  const { data: organizations } = useGetOrganizations();

  const activeOrgId = session?.orgId as string | null | undefined;
  const activeOrg =
    organizations?.find((o) => o.id === activeOrgId) ?? organizations?.[0];
  const otherOrgs = organizations?.filter((o) => o.id !== activeOrg?.id) ?? [];
  const isOrgOwner = access?.isOrgOwner === true;
  const canLeave = access?.isOrgOwner === false;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  const handleClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  const handleSwitch = useCallback(
    (orgId: string) => {
      requestLeave(() => switchOrg.mutate(orgId));
    },
    [requestLeave, switchOrg],
  );

  const handleCreateWorkspace = useCallback(() => {
    setCreateMounted(true);
    setCreateOpen(true);
  }, []);

  const handleRequestLeave = useCallback(() => {
    setLeaveMounted(true);
    setLeaveOpen(true);
  }, []);

  const handleLeaveOpenChange = useCallback((open: boolean) => {
    setLeaveOpen(open);
  }, []);

  const handleTriggerClick = useCallback(() => {
    if (triggerOnly) {
      onRequestOpen?.();
      return;
    }
    handleOpenChange(true);
  }, [triggerOnly, onRequestOpen, handleOpenChange]);

  const isSidebar = variant === "sidebar";
  const isLabelHidden = isSidebar && iconOnly;
  const workspaceName = activeOrg?.name ?? "Organization";

  const panelProps = {
    canLeave,
    activeOrg,
    otherOrgs,
    isOrgOwner,
    onClose: handleClose,
    onSwitch: handleSwitch,
    isPending: switchOrg.isPending,
    onRequestLeave: handleRequestLeave,
    onCreateWorkspace: handleCreateWorkspace,
  };

  const identityClassName = cn(
    "flex items-center outline-none",
    isLabelHidden
      ? "h-8 w-8 justify-center rounded-lg text-sidebar-foreground/70"
      : isSidebar
        ? "gap-1.5 h-8 w-full min-w-0 px-2 rounded-lg text-sm font-medium text-sidebar-foreground/80"
        : "gap-1.5 h-8 min-w-0 max-w-[12rem] px-2 rounded-lg text-sm font-medium text-sidebar-foreground/80",
    className,
  );

  const identityContent = (
    <>
      <Building2
        className={cn(
          "shrink-0",
          isLabelHidden ? "h-4 w-4" : "h-3.5 w-3.5",
          "text-sidebar-foreground/50",
        )}
      />
      {!isLabelHidden && (
        <TruncatedText
          text={workspaceName}
          className="flex-1 text-sm font-medium text-sidebar-foreground"
        />
      )}
    </>
  );

  const triggerButton = (
    <button
      type="button"
      onClick={triggerOnly ? handleTriggerClick : undefined}
      aria-label={
        isLabelHidden ? `Switch organization — ${workspaceName}` : "Switch organization"
      }
      className={cn(
        identityClassName,
        "focus-visible:ring-2 focus-visible:ring-ring transition-colors motion-reduce:transition-none",
        isLabelHidden
          ? "hover:text-sidebar-foreground hover:bg-sidebar-accent"
          : "hover:text-sidebar-foreground hover:bg-sidebar-accent",
      )}
      disabled={switchOrg.isPending}
    >
      {identityContent}
      {!isLabelHidden && (
        <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
      )}
    </button>
  );

  const createDialog = createMounted ? (
    <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
  ) : null;
  const leaveDialog = leaveMounted ? (
    <LeaveOrganizationDialog
      open={leaveOpen}
      onOpenChange={handleLeaveOpenChange}
    />
  ) : null;

  if (drawerOnly) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
          <DrawerContent className="flex h-[min(96dvh,40rem)] max-h-[96dvh] w-full flex-col gap-0 overflow-hidden rounded-t-xl border-t bg-sidebar p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <DrawerTitle className="sr-only">Organizations</DrawerTitle>
            <DrawerDescription className="sr-only">
              Every organization this account belongs to. Choosing one switches
              the whole workspace over to it.
            </DrawerDescription>
            <OrganizationSwitcherPanel {...panelProps} layout="drawer" />
          </DrawerContent>
        </Drawer>
        {createDialog}
        {leaveDialog}
      </>
    );
  }

  if (triggerOnly) {
    return (
      <>
        {isLabelHidden ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="text-xs font-medium"
            >
              {workspaceName}
            </TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}
        {createDialog}
        {leaveDialog}
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        {isLabelHidden ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="text-xs font-medium"
            >
              {workspaceName}
            </TooltipContent>
          </Tooltip>
        ) : (
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        )}
        <DropdownMenuContent align="start" className="w-52">
          <OrganizationSwitcherPanel {...panelProps} layout="dropdown" />
        </DropdownMenuContent>
      </DropdownMenu>
      {createDialog}
      {leaveDialog}
    </>
  );
}

export { OrganizationSwitcher as WorkspaceSwitcher };
