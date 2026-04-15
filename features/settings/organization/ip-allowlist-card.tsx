"use client";

import { useState, useCallback, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Network, X, Plus } from "lucide-react";
import { useUpdateOrgSettings } from "@/lib/api/hooks/organization";
import { toast } from "sonner";
import type { OrgSettings } from "@/types/organization";

// ─── IP Badge Item ─────────────────────────────────────────────────────────────

interface IpBadgeItemProps {
  ip: string;
  onRemove: (ip: string) => void;
}

const IpBadgeItem = memo(function IpBadgeItem({ ip, onRemove }: IpBadgeItemProps) {
  const handleRemove = useCallback(() => onRemove(ip), [onRemove, ip]);
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-mono text-xs">
      {ip}
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 rounded-full hover:bg-muted p-0.5"
        aria-label={`Remove ${ip}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────

interface IpAllowlistCardProps {
  org: OrgSettings;
}

export function IpAllowlistCard({ org }: IpAllowlistCardProps) {
  const [initialized, setInitialized] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");

  const { mutate: updateOrg, isPending: isUpdating } = useUpdateOrgSettings();

  // Lazy-initialize state from org on first render
  if (!initialized && org) {
    setIpAllowlist(org.ipAllowlist ?? []);
    setInitialized(true);
  }

  const handleIpInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setIpInput(e.target.value),
    []
  );

  const handleAddIp = useCallback(() => {
    const ip = ipInput.trim();
    if (!ip || ipAllowlist.includes(ip)) return;
    setIpAllowlist((prev) => [...prev, ip]);
    setIpInput("");
  }, [ipInput, ipAllowlist]);

  const handleRemoveIp = useCallback((ip: string) => {
    setIpAllowlist((prev) => prev.filter((i) => i !== ip));
  }, []);

  const handleIpKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddIp();
      }
    },
    [handleAddIp]
  );

  const handleSave = useCallback(() => {
    updateOrg(
      { ipAllowlist },
      {
        onSuccess: () => toast.success("IP allowlist saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
      }
    );
  }, [ipAllowlist, updateOrg]);

  return (
    <Card className="rounded-xl border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Network className="h-4 w-4 text-gold" />
          IP Allowlist
        </CardTitle>
        <CardDescription>
          Restrict dashboard access to specific IP addresses or prefixes. Leave empty to allow access from any IP.
          Add exact IPs (e.g. <code>203.0.113.5</code>) or prefixes (e.g. <code>192.168.1.</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-8">
          {ipAllowlist.map((ip) => (
            <IpBadgeItem key={ip} ip={ip} onRemove={handleRemoveIp} />
          ))}
          {ipAllowlist.length === 0 && (
            <span className="text-xs text-muted-foreground">No IP restrictions — all IPs allowed.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 203.0.113.5 or 192.168.1."
            value={ipInput}
            onChange={handleIpInputChange}
            onKeyDown={handleIpKeyDown}
            className="w-full max-w-sm font-mono text-sm"
            aria-label="IP address or prefix to add"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddIp}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
        <div className="pt-1">
          <Button onClick={handleSave} disabled={isUpdating} size="sm">
            {isUpdating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save IP Allowlist"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
