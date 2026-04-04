"use client";

import { useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Key, Plus, Trash2, Loader2, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/lib/api/hooks/api-keys";
import { toast } from "sonner";

/* ── Copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopy} aria-label="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

/* ── Create dialog ── */
function CreateKeyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);
  const createKey = useCreateApiKey();

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createKey.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (data) => {
          setGeneratedKey(data.key);
          toast.success("API key created — copy it now, it won't be shown again.");
        },
        onError: () => toast.error("Failed to create API key"),
      }
    );
  }, [name, description, createKey]);

  const handleClose = useCallback(() => {
    setName("");
    setDescription("");
    setGeneratedKey(null);
    setShowKey(true);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Key className="h-4 w-4" />
            {generatedKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Copy your key now. For security, it will not be shown again.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted border font-mono text-[12px] break-all">
              <span className="flex-1">{showKey ? generatedKey : "•".repeat(40)}</span>
              <button
                onClick={() => setShowKey((v) => !v)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                aria-label={showKey ? "Hide" : "Show"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyButton text={generatedKey} />
            </div>
            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              Use this key in the <code>Authorization: Bearer {"<key>"}</code> header.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="key-name" className="text-[13px]">Name *</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Zapier Integration"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-desc" className="text-[13px]">Description</Label>
              <Input
                id="key-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this key for?"
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="h-8 text-xs">
            {generatedKey ? "Done" : "Cancel"}
          </Button>
          {!generatedKey && (
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createKey.isPending}
              className="h-8 text-xs"
            >
              {createKey.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create key"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Page ── */
export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: keys, isLoading } = useApiKeys();
  const revokeKey = useRevokeApiKey();

  const handleRevoke = useCallback((keyId: string) => {
    revokeKey.mutate(keyId, {
      onSuccess: () => toast.success("API key revoked"),
      onError: () => toast.error("Failed to revoke API key"),
    });
  }, [revokeKey]);

  const activeKeys = keys?.filter((k) => !k.isRevoked) ?? [];
  const revokedKeys = keys?.filter((k) => k.isRevoked) ?? [];

  return (
    <PageWrapper
      title="API Keys"
      subtitle="Generate API keys for external integrations. Keys have full org access."
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New API Key
        </Button>
      }
    >
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-16 rounded-md bg-muted/50 animate-pulse" />)}
              </div>
            ) : activeKeys.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Key className="h-8 w-8 opacity-20" />
                <p className="text-sm">No active API keys.</p>
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="mt-2 h-8 text-xs">
                  Create your first key
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {activeKeys.map((key) => (
                  <div key={key.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium">{key.name}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                          {key.keyPrefix}…
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Created {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })} by {key.createdBy}
                        {key.lastUsedAt && ` · Last used ${formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })}`}
                        {key.expiresAt && ` · Expires ${format(new Date(key.expiresAt), "dd MMM yyyy")}`}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                          disabled={revokeKey.isPending}
                          aria-label="Revoke key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke &ldquo;{key.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Revoking this key immediately blocks all requests using it. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {revokedKeys.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Revoked</p>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {revokedKeys.map((key) => (
                    <div key={key.id} className="flex items-center gap-4 px-4 py-3 opacity-50">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Key className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium line-through">{key.name}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-destructive border-destructive/30">
                            Revoked
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">{key.keyPrefix}…</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <CreateKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageWrapper>
  );
}
