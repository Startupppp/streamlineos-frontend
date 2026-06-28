"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Key, Plus, ShieldOff, Trash2, Copy, Check, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  useApiTokens,
  useCreateApiToken,
  useRevokeApiToken,
  useDeleteApiToken,
  type CreateApiTokenInput,
} from "@/lib/api/hooks/api-tokens";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiToken, CreateApiTokenResponse } from "@/lib/api/hooks/api-tokens";

const AVAILABLE_SCOPES = [
  "read:all",
  "write:all",
  "read:org",
  "write:org",
  "read:hr",
  "write:hr",
  "read:crm",
  "write:crm",
  "read:projects",
  "write:projects",
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  scopes: z.array(z.string()).min(1, "Select at least one scope"),
  expiresAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function TokenCreatedDialog({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: CreateApiTokenResponse | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!result?.token) return;
    navigator.clipboard.writeText(result.token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result?.token]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Token Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            Copy this token now. You won&apos;t be able to see it again.
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={result?.token ?? ""}
              className="font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTokenSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (result: CreateApiTokenResponse) => void;
}) {
  const create = useCreateApiToken();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", scopes: [], expiresAt: "" },
  });

  const handleSubmit = useCallback(
    (values: FormValues) => {
      const input: CreateApiTokenInput = {
        name: values.name,
        description: values.description || undefined,
        scopes: values.scopes,
        expiresAt: values.expiresAt || undefined,
      };
      create.mutate(input, {
        onSuccess: (result) => {
          form.reset();
          onCreated(result);
        },
        onError: (err) => toast.error(getApiError(err)),
      });
    },
    [create, form, onCreated],
  );

  const toggleScope = useCallback(
    (scope: string, current: string[], onChange: (v: string[]) => void) => {
      if (current.includes(scope)) {
        onChange(current.filter((s) => s !== scope));
      } else {
        onChange([...current, scope]);
      }
    },
    [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New API Token</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form id="token-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CI/CD Deploy Key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="What is this token used for?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>Leave blank for a non-expiring token.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="scopes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scopes</FormLabel>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVAILABLE_SCOPES.map((scope) => {
                      const selected = field.value.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope, field.value, field.onChange)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {scope}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button type="submit" form="token-form" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create Token"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function ApiTokensPage() {
  const { data, isLoading } = useApiTokens();
  const revoke = useRevokeApiToken();
  const del = useDeleteApiToken();

  const [showCreate, setShowCreate] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreateApiTokenResponse | null>(null);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const [deleting, setDeleting] = useState<ApiToken | null>(null);

  const tokens = data?.data ?? [];

  const handleCreated = useCallback((result: CreateApiTokenResponse) => {
    setShowCreate(false);
    setCreatedResult(result);
  }, []);

  const handleRevoke = useCallback(() => {
    if (!revoking) return;
    revoke.mutate(revoking.id, {
      onSuccess: () => {
        toast.success("Token revoked");
        setRevoking(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [revoking, revoke]);

  const handleDelete = useCallback(() => {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Token deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }, [deleting, del]);

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleCloseCreated = useCallback(() => setCreatedResult(null), []);

  return (
    <PageWrapper
      title="API Tokens"
      subtitle="Create and manage API tokens for programmatic access to your organization."
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Token
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
          <Key className="h-10 w-10 opacity-30" />
          <p className="text-sm">No API tokens yet</p>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Token
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((t) => {
              const expired = isExpired(t.expiresAt);
              return (
                <TableRow key={t.id} className={t.isRevoked ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      {t.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {t.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{t.keyPrefix}…</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {t.scopes.slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs px-1.5 py-0">
                          {s}
                        </Badge>
                      ))}
                      {t.scopes.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          +{t.scopes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {expired && <Clock className="h-3.5 w-3.5 text-destructive" />}
                      <span className={expired ? "text-destructive" : ""}>
                        {formatDate(t.expiresAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.lastUsedAt)}</TableCell>
                  <TableCell>
                    {t.isRevoked ? (
                      <Badge variant="secondary" className="text-destructive border-destructive/20 bg-destructive/10">
                        Revoked
                      </Badge>
                    ) : expired ? (
                      <Badge variant="secondary" className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400">
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400">
                        <Shield className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!t.isRevoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevoking(t)}
                          title="Revoke"
                        >
                          <ShieldOff className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(t)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <CreateTokenSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />

      <TokenCreatedDialog
        open={!!createdResult}
        result={createdResult}
        onClose={handleCloseCreated}
      />

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke Token"
        description={`Revoke "${revoking?.name}"? API calls using this token will immediately fail.`}
        onConfirm={handleRevoke}
        isPending={revoke.isPending}
        destructive
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Token"
        description={`Permanently delete "${deleting?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        isPending={del.isPending}
        destructive
      />
    </PageWrapper>
  );
}
