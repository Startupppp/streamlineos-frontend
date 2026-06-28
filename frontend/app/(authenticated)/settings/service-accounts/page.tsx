"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RotateCcw, Bot, Copy, Check } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiClient, getApiError } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";

type ServiceAccount = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
};

type CreateResult = {
  serviceAccount: ServiceAccount;
  apiKey: string;
};

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

function useServiceAccounts() {
  return useQuery<{ data: ServiceAccount[] }>({
    queryKey: ["service-accounts"],
    queryFn: () => apiClient.get("/service-accounts"),
  });
}

function useCreateServiceAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormValues) =>
      apiClient.post<CreateResult>("/service-accounts", { ...input, permissions: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });
}

function useDeleteServiceAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/service-accounts/${id}`),
    onSuccess: () => {
      toast.success("Service account deleted");
      queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: (err) => toast.error(getApiError(err)),
  });
}

function useRotateKey() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ apiKey: string }>(`/service-accounts/${id}/rotate-key`, {}),
    onError: (err) => toast.error(getApiError(err)),
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1">
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function ApiKeyDisplay({ apiKey, onClose }: { apiKey: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save your API key</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This key is shown only once. Copy it now — you won&apos;t be able to see it again.
        </p>
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-3 font-mono text-xs break-all">
          <span className="flex-1 select-all">{apiKey}</span>
          <CopyButton value={apiKey} />
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceAccountsPage() {
  const { data, isLoading } = useServiceAccounts();
  const createMutation = useCreateServiceAccount();
  const deleteMutation = useDeleteServiceAccount();
  const rotateMutation = useRotateKey();
  const [showCreate, setShowCreate] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "" },
  });

  const handleCreate = useCallback(async (values: CreateFormValues) => {
    const result = await createMutation.mutateAsync(values);
    setRevealedKey(result.apiKey);
    setShowCreate(false);
    form.reset();
  }, [createMutation, form]);

  const handleRotate = useCallback(async (id: string) => {
    const result = await rotateMutation.mutateAsync(id);
    setRevealedKey(result.apiKey);
  }, [rotateMutation]);

  const serviceAccounts = data?.data ?? [];

  return (
    <PageWrapper
      title="Service Accounts"
      subtitle="Non-human principals for integrations and automation"
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New service account
        </Button>
      }
    >
      <div className="max-w-3xl space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : serviceAccounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">No service accounts yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Create one to allow automated integrations to access the API.</p>
              </div>
              <Button size="sm" onClick={() => setShowCreate(true)} className="mt-2 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New service account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {serviceAccounts.map((sa) => (
                <div key={sa.id} className="flex items-start gap-4 p-4">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sa.name}</p>
                      <Badge variant={sa.isActive ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                        {sa.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {sa.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{sa.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      Created {formatDistanceToNow(new Date(sa.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleRotate(sa.id)}
                      disabled={rotateMutation.isPending}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Rotate key
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => deleteMutation.mutate(sa.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New service account</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Name</Label>
              <Input {...form.register("name")} placeholder="CI/CD pipeline" />
              {form.formState.errors.name && (
                <p className="text-[12px] text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Description</Label>
              <Input {...form.register("description")} placeholder="Optional description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {revealedKey && <ApiKeyDisplay apiKey={revealedKey} onClose={() => setRevealedKey(null)} />}
    </PageWrapper>
  );
}
