"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Lock, Globe, Users, Link2, Copy, RefreshCw, Eye, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateWhiteboardSharing,
  useRotateWhiteboardShareToken,
  useSetWhiteboardShares,
  useRemoveWhiteboardShare,
  type WhiteboardDetail,
  type WhiteboardVisibility,
  type WhiteboardShareRole,
} from "@/hooks/api/projects";
import { useOrgMembers } from "@/hooks/api/organization";

const VISIBILITY_OPTIONS: { value: WhiteboardVisibility; label: string; icon: typeof Lock; desc: string }[] = [
  { value: "private", label: "Private", icon: Lock, desc: "Only you and invited people" },
  { value: "project", label: "Project", icon: Users, desc: "All project members" },
  { value: "public", label: "Public link", icon: Globe, desc: "Anyone with the link" },
];

const SHARE_ROLES: readonly WhiteboardShareRole[] = ["viewer", "editor"];

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

type ExpiryPreset = typeof EXPIRY_OPTIONS[number]["value"];

const EXPIRY_PRESETS: readonly ExpiryPreset[] = EXPIRY_OPTIONS.map((o) => o.value);

function computeExpiry(preset: ExpiryPreset): string | null {
  if (preset === "never") return null;
  const ms: Record<string, number> = { "1d": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000 };
  return new Date(Date.now() + (ms[preset] ?? 0)).toISOString();
}

interface ShareDialogProps {
  projectId: number;
  whiteboard: WhiteboardDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ projectId, whiteboard, open, onOpenChange }: ShareDialogProps) {
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

  const { data: membersData } = useOrgMembers(1, 20, querySearch || undefined, { enabled: pickerOpen, staleTime: 30_000 });
  const excludedIds = new Set([...shares.map((s) => s.userId), whiteboard.createdBy ?? ""]);
  const availableMembers = (membersData?.data ?? []).filter((m) => !excludedIds.has(m.userId));

  function handleVisibilityChange(v: WhiteboardVisibility) {
    updateSharing.mutate({ id: whiteboard.id, visibility: v }, {
      onSuccess: () => toast.success("Visibility updated"),
      onError: () => toast.error("Failed to update visibility"),
    });
  }
  function handleAddMember(userId: string) {
    const defaultRole: WhiteboardShareRole = "viewer";
    const newShares = [...shares.map((s) => ({ userId: s.userId, role: s.role })), { userId, role: defaultRole }];
    setShares.mutate({ id: whiteboard.id, shares: newShares }, {
      onSuccess: () => { toast.success("Member added"); setPickerOpen(false); setSearchInput(""); },
      onError: () => toast.error("Failed to add member"),
    });
  }
  function handleRoleChange(userId: string, role: WhiteboardShareRole) {
    const updated = shares.map((s) => ({ userId: s.userId, role: s.userId === userId ? role : s.role }));
    setShares.mutate({ id: whiteboard.id, shares: updated }, { onError: () => toast.error("Failed to update role") });
  }
  function handleRemoveMember(userId: string) {
    removeShare.mutate({ id: whiteboard.id, userId }, {
      onSuccess: () => toast.success("Member removed"),
      onError: () => toast.error("Failed to remove member"),
    });
  }
  const handleCopyLink = useCallback(() => {
    if (!sharing?.shareToken) return;
    const url = `${window.location.origin}/board/${sharing.shareToken}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"), () => toast.error("Failed to copy link"));
  }, [sharing?.shareToken]);
  function handlePublicAccessChange(role: WhiteboardShareRole) {
    updateSharing.mutate({ id: whiteboard.id, publicAccess: role }, { onError: () => toast.error("Failed to update access") });
  }
  function handleExpiryChange(preset: ExpiryPreset) {
    updateSharing.mutate({ id: whiteboard.id, linkExpiresAt: computeExpiry(preset) }, { onError: () => toast.error("Failed to update expiry") });
  }
  function handleAllowExportChange(checked: boolean) {
    updateSharing.mutate({ id: whiteboard.id, allowExport: checked }, { onError: () => toast.error("Failed to update setting") });
  }
  function handleConfirmReset() {
    rotateToken.mutate(whiteboard.id, {
      onSuccess: () => { toast.success("Link reset — old links no longer work"); setConfirmReset(false); },
      onError: () => toast.error("Failed to reset link"),
    });
  }
  function handleCancelReset() { setConfirmReset(false); }
  function handleBeginReset() { setConfirmReset(true); }

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
                  <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">People</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">Add people</Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search members…" value={searchInput} onValueChange={setSearchInput} />
                    <CommandList className="max-h-48">
                      <CommandEmpty>No members found</CommandEmpty>
                      <CommandGroup>
                        {availableMembers.map((m) => (
                          <CommandItem key={m.userId} value={m.userId} onSelect={() => handleAddMember(m.userId)}>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm truncate">{m.name ?? m.email}</span>
                              {m.name && <span className="text-xs text-muted-foreground truncate">{m.email}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                      onValueChange={(v) => {
                        const role = SHARE_ROLES.find((r) => r === v);
                        if (role) handleRoleChange(share.userId, role);
                      }}
                      disabled={setShares.isPending || share.userId === currentUserId}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer"><Eye className="h-3 w-3 inline mr-1" />Viewer</SelectItem>
                        <SelectItem value="editor"><Pencil className="h-3 w-3 inline mr-1" />Editor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveMember(share.userId)} disabled={removeShare.isPending} aria-label="Remove">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isPublic && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Link2 className="h-3.5 w-3.5" />Public link
              </div>
              <div className="flex gap-1.5">
                <Input readOnly value={publicUrl} className="h-8 text-xs font-mono" aria-label="Share URL" />
                <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={handleCopyLink} aria-label="Copy link"><Copy className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Anyone can</Label>
                <Select
                  value={sharing.publicAccess}
                  onValueChange={(v) => {
                    const role = SHARE_ROLES.find((r) => r === v);
                    if (role) handlePublicAccessChange(role);
                  }}
                  disabled={updateSharing.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">View</SelectItem>
                    <SelectItem value="editor">Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Link expires</Label>
                <Select
                  onValueChange={(v) => {
                    const preset = EXPIRY_PRESETS.find((p) => p === v);
                    if (preset) handleExpiryChange(preset);
                  }}
                  disabled={updateSharing.isPending}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder={sharing.linkExpiresAt ? new Date(sharing.linkExpiresAt).toLocaleDateString() : "Never"} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="allow-export" className="text-xs text-muted-foreground">Allow export</Label>
                <Switch id="allow-export" checked={sharing.allowExport} onCheckedChange={handleAllowExportChange} disabled={updateSharing.isPending} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                {confirmReset ? (
                  <>
                    <p className="text-xs text-muted-foreground flex-1">Old links will stop working.</p>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={handleConfirmReset} disabled={rotateToken.isPending}>Confirm</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelReset}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBeginReset}>
                    <RefreshCw className="h-3 w-3" />Reset link
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
