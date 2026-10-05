"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link2, RefreshCw } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon } from "@animateicons/react/lucide";
import type { WhiteboardShareRole } from "@/hooks/api/build/whiteboards";

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
] as const;

type ExpiryPreset = typeof EXPIRY_OPTIONS[number]["value"];

const EXPIRY_PRESETS: readonly ExpiryPreset[] = EXPIRY_OPTIONS.map((o) => o.value);

const EXPIRY_MS: Record<string, number> = { "1d": 86_400_000, "7d": 604_800_000, "30d": 2_592_000_000 };

const SHARE_ROLES: readonly WhiteboardShareRole[] = ["viewer", "editor"];

function computeExpiry(preset: ExpiryPreset): string | null {
  if (preset === "never") return null;
  return new Date(Date.now() + (EXPIRY_MS[preset] ?? 0)).toISOString();
}

interface SharePublicLinkSectionProps {
  publicUrl: string;
  linkExpiresAt?: string | null;
  publicAccess?: WhiteboardShareRole | null;
  allowExport: boolean;
  confirmReset: boolean;
  isUpdatePending: boolean;
  isRotatePending: boolean;
  onCopyLink: () => void;
  onPublicAccessChange: (role: WhiteboardShareRole) => void;
  onExpiryChange: (linkExpiresAt: string | null) => void;
  onAllowExportChange: (checked: boolean) => void;
  onBeginReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
}

export function SharePublicLinkSection({
  publicUrl,
  linkExpiresAt,
  publicAccess,
  allowExport,
  confirmReset,
  isUpdatePending,
  isRotatePending,
  onCopyLink,
  onPublicAccessChange,
  onExpiryChange,
  onAllowExportChange,
  onBeginReset,
  onConfirmReset,
  onCancelReset,
}: SharePublicLinkSectionProps) {
  function handlePublicAccess(value: string): void {
    const role = SHARE_ROLES.find((r) => r === value);
    if (role) onPublicAccessChange(role);
  }

  function handleExpiry(value: string): void {
    const preset = EXPIRY_PRESETS.find((p) => p === value);
    if (preset) onExpiryChange(computeExpiry(preset));
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Link2 className="h-3.5 w-3.5" />Public link
      </div>
      <div className="flex gap-1.5">
        <Input readOnly value={publicUrl} className="font-mono" aria-label="Share URL" />
        <AnimatedIconButton size="sm" variant="outline" className="h-8 shrink-0" onClick={onCopyLink} aria-label="Copy link" icon={CopyIcon} iconSize={14} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">Anyone can</Label>
        <Select value={publicAccess ?? undefined} onValueChange={handlePublicAccess} disabled={isUpdatePending}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">View</SelectItem>
            <SelectItem value="editor">Edit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">Link expires</Label>
        <Select onValueChange={handleExpiry} disabled={isUpdatePending}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder={linkExpiresAt ? new Date(linkExpiresAt).toLocaleDateString() : "Never"} />
          </SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="allow-export" className="text-xs text-muted-foreground">Allow export</Label>
        <Switch id="allow-export" checked={allowExport} onCheckedChange={onAllowExportChange} disabled={isUpdatePending} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        {confirmReset ? (
          <>
            <p className="text-xs text-muted-foreground flex-1">Old links will stop working.</p>
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onConfirmReset} disabled={isRotatePending}>Confirm</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelReset}>Cancel</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onBeginReset}>
            <RefreshCw className="h-3 w-3" />Reset link
          </Button>
        )}
      </div>
    </div>
  );
}
