"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { Lock, Globe, Users, Eye, Pencil } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { XIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateWhiteboardSharing,
  useRotateWhiteboardShareToken,
  useSetWhiteboardShares,
  useRemoveWhiteboardShare,
  type WhiteboardDetail,
  type WhiteboardVisibility,
  type WhiteboardShareRole,
} from "@/hooks/api/build/whiteboards";
import { useBuildMembers } from "@/hooks/api/build/build-members";
import { useCanState } from "@/hooks/api/access";
import { SharePublicLinkSection } from "./share-public-link-section";

const VISIBILITY_OPTIONS: { value: WhiteboardVisibility; label: string; icon: typeof Lock; desc: string }[] = [
  { value: "private", label: "Private", icon: Lock, desc: "Only you and invited people" },
  { value: "project", label: "Project", icon: Users, desc: "All project members" },
  { value: "public", label: "Public link", icon: Globe, desc: "Anyone with the link" },
];

const SHARE_ROLES: readonly WhiteboardShareRole[] = ["viewer", "editor"];

interface ShareDialogProps {
  projectId: number;
  whiteboard: WhiteboardDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ projectId, whiteboard, open, onOpenChange }: ShareDialogProps) {
  const accessState = useCanState("build:whiteboards:manage");
  const { data: session } = useSession();
  const currentUserId = session?.user.id;
  const sharing = whiteboard.sharing;
  const shares = whiteboard.shares ?? [];

  const updateSharing = useUpdateWhiteboardSharing(projectId);
  const rotateToken = useRotateWhiteboardShareToken(projectId);
  const setShares = useSetWhiteboardShares(projectId);
  const removeShare = useRemoveWhiteboardShare(projectId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuerySearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: membersData } = useBuildMembers(
    { limit: 20, search: querySearch || undefined },
    { enabled: pickerOpen, staleTime: 30_000 },
  );
  const excludedIds = new Set([...shares.map((s) => s.userId), whiteboard.createdBy ?? ""]);
  const availableMembers = (membersData?.data ?? []).filter((m) => !excludedIds.has(m.id));

  function handleVisibilityChange(v: WhiteboardVisibility) {
    updateSharing.mutate({ whiteboardId: whiteboard.id, visibility: v }, {
      onSuccess: () => toast.success("Visibility updated"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }
  function handleAddMember(userId: string) {
    const defaultRole: WhiteboardShareRole = "viewer";
    const newShares = [...shares.map((s) => ({ userId: s.userId, role: s.role })), { userId, role: defaultRole }];
    setShares.mutate({ whiteboardId: whiteboard.id, shares: newShares }, {
      onSuccess: () => { toast.success("Member added"); setPickerOpen(false); setSearchInput(""); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }
  function handleRoleChange(userId: string, role: WhiteboardShareRole) {
    const updated = shares.map((s) => ({ userId: s.userId, role: s.userId === userId ? role : s.role }));
    setShares.mutate({ whiteboardId: whiteboard.id, shares: updated }, { onError: (e) => toast.error(getErrorMessage(e)) });
  }
  function handleRemoveMember(userId: string) {
    removeShare.mutate({ whiteboardId: whiteboard.id, userId }, {
      onSuccess: () => toast.success("Member removed"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }
  const handleCopyLink = useCallback(() => {
    if (!sharing?.shareToken) return;
    const url = `${window.location.origin}/board/${sharing.shareToken}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"), (e) => toast.error(getErrorMessage(e)));
  }, [sharing?.shareToken]);
  function handlePublicAccessChange(role: WhiteboardShareRole) {
    updateSharing.mutate({ whiteboardId: whiteboard.id, publicAccess: role }, { onError: (e) => toast.error(getErrorMessage(e)) });
  }
  function handleExpiryChange(linkExpiresAt: string | null) {
    updateSharing.mutate({ whiteboardId: whiteboard.id, linkExpiresAt }, { onError: (e) => toast.error(getErrorMessage(e)) });
  }
  function selectMemberRole(userId: string) {
    return function handleMemberRoleSelected(value: string): void {
      const role = SHARE_ROLES.find((r) => r === value);
      if (role) handleRoleChange(userId, role);
    };
  }
  function handleAllowExportChange(checked: boolean) {
    updateSharing.mutate({ whiteboardId: whiteboard.id, allowExport: checked }, { onError: (e) => toast.error(getErrorMessage(e)) });
  }
  function handleConfirmReset() {
    rotateToken.mutate(whiteboard.id, {
      onSuccess: () => { toast.success("Link reset — old links no longer work"); setConfirmReset(false); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }
  function handleCancelReset() { setConfirmReset(false); }
  function handleBeginReset() { setConfirmReset(true); }

  if (accessState === "denied" || accessState === "loading") return null;

  if (!sharing) return null;

  const isPublic = sharing.visibility === "public" || whiteboard.visibility === "public";
  const publicUrl = sharing.shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/board/${sharing.shareToken}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share board</DialogTitle>
          <DialogDescription>
            Choose who can access this board and what they can do.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Visibility</Label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleVisibilityChange(value)}
                  disabled={updateSharing.isPending}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-center text-xs transition-colors",
                    sharing.visibility === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-accent hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{label}</span>
                  <span className="text-micro leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">People</Label>
              <ResponsivePopover open={pickerOpen} onOpenChange={setPickerOpen}>
                <ResponsivePopoverTrigger asChild>
                  <Button size="sm" variant="outline">Add people</Button>
                </ResponsivePopoverTrigger>
                <ResponsivePopoverContent title="Add people" className="p-0 w-64" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search members…" value={searchInput} onValueChange={setSearchInput} />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No members found</CommandEmpty>
                      <CommandGroup>
                        {availableMembers.map((m) => (
                          <CommandItem key={m.id} value={m.id} onSelect={() => handleAddMember(m.id)}>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm truncate">{m.name ?? m.email}</span>
                              {m.name && <span className="text-xs text-muted-foreground truncate">{m.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </ResponsivePopoverContent>
              </ResponsivePopover>
            </div>
            {shares.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">No individual shares yet.</p>
            ) : (
              <ul className="space-y-1">
                {shares.map((share) => (
                  <li key={share.userId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{share.name ?? share.email ?? "Unknown user"}</p>
                      {share.name && <p className="text-xs text-muted-foreground truncate">{share.email}</p>}
                    </div>
                    <Select
                      value={share.role}
                      onValueChange={selectMemberRole(share.userId)}
                      disabled={setShares.isPending || share.userId === currentUserId}
                    >
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer"><Eye className="h-3 w-3 inline mr-1" />Viewer</SelectItem>
                        <SelectItem value="editor"><Pencil className="h-3 w-3 inline mr-1" />Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <AnimatedIconButton
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(share.userId)}
                      disabled={removeShare.isPending}
                      aria-label="Remove"
                      icon={XIcon}
                      iconSize={14}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isPublic && (
            <SharePublicLinkSection
              publicUrl={publicUrl}
              linkExpiresAt={sharing.linkExpiresAt}
              publicAccess={sharing.publicAccess}
              allowExport={sharing.allowExport}
              confirmReset={confirmReset}
              isUpdatePending={updateSharing.isPending}
              isRotatePending={rotateToken.isPending}
              onCopyLink={handleCopyLink}
              onPublicAccessChange={handlePublicAccessChange}
              onExpiryChange={handleExpiryChange}
              onAllowExportChange={handleAllowExportChange}
              onBeginReset={handleBeginReset}
              onConfirmReset={handleConfirmReset}
              onCancelReset={handleCancelReset}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
