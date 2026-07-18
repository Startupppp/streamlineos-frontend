"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, CheckCircle2, Check } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Trash2Icon, PlusIcon, CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { apiClient, getApiError } from "@/lib/api-client";

type OrgCustomDomain = {
  id: string;
  domain: string;
  verificationToken: string;
  verifiedAt: string | null;
  createdAt: string;
};

const addDomainSchema = z.object({
  domain: z.string().min(3).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Invalid domain (e.g. app.acme.com)"),
});

type AddDomainValues = z.infer<typeof addDomainSchema>;

function useCustomDomains() {
  return useQuery<OrgCustomDomain[]>({
    queryKey: ["org", "custom-domains"],
    queryFn: () => apiClient.get<OrgCustomDomain[]>("/organization/custom-domains"),
  });
}

function useAddDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddDomainValues) => apiClient.post<OrgCustomDomain>("/organization/custom-domains", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "custom-domains"] });
      toast.success("Domain added — add the TXT record to verify");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
}

function useVerifyDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/organization/custom-domains/${id}/verify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "custom-domains"] });
      toast.success("Domain verified");
    },
    onError: () => toast.error("Verification failed — ensure the TXT record is published and allow up to 48h for DNS propagation"),
  });
}

function useRemoveDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organization/custom-domains/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", "custom-domains"] });
      toast.success("Domain removed");
    },
    onError: (err) => toast.error(getApiError(err)),
  });
}

function RemoveDomainButton({ domainId, onRemove, disabled }: { domainId: string; onRemove: (id: string) => void; disabled: boolean }) {
  function handleClick() {
    onRemove(domainId);
  }
  return (
    <AnimatedIconButton
      icon={Trash2Icon}
      iconSize={16}
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handleClick}
      disabled={disabled}
      aria-label="Remove domain"
    />
  );
}

function VerifyDomainButton({ domainId, onVerify, isPending }: { domainId: string; onVerify: (id: string) => void; isPending: boolean }) {
  function handleClick() {
    onVerify(domainId);
  }
  return (
    <LoadingButton size="sm" variant="outline" className="h-7 text-xs gap-1" isPending={isPending} onClick={handleClick} loadingText="Verifying…">
      Verify now
    </LoadingButton>
  );
}

function CopyTokenButton({ token, copied, onCopy }: { token: string; copied: boolean; onCopy: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (copied) {
    return <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />;
  }
  return (
    <button type="button" onClick={onCopy} className="shrink-0 text-muted-foreground hover:text-foreground" {...hoverHandlers}>
      <CopyIcon ref={iconRef} size={14} />
    </button>
  );
}

function CopyableToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [token]);
  return (
    <div className="flex items-center gap-1.5 rounded border bg-muted px-2 py-1.5 mt-1">
      <code className="text-[11px] flex-1 break-all">{token}</code>
      <CopyTokenButton token={token} copied={copied} onCopy={handleCopy} />
    </div>
  );
}

interface OrgCustomDomainsSectionProps {
  canEdit: boolean;
}

export function OrgCustomDomainsSection({ canEdit }: OrgCustomDomainsSectionProps) {
  const { data: domains, isLoading } = useCustomDomains();
  const addMutation = useAddDomain();
  const verifyMutation = useVerifyDomain();
  const removeMutation = useRemoveDomain();
  const [showAdd, setShowAdd] = useState(false);

  const form = useForm<AddDomainValues>({
    resolver: zodResolver(addDomainSchema),
    defaultValues: { domain: "" },
  });

  const handleAdd = useCallback((values: AddDomainValues) => {
    addMutation.mutate(values, {
      onSuccess: () => {
        setShowAdd(false);
        form.reset();
      },
    });
  }, [addMutation, form]);

  const handleOpenAdd = useCallback(() => setShowAdd(true), []);
  const handleCancelAdd = useCallback(() => { setShowAdd(false); form.reset(); }, [form]);
  const handleRemove = useCallback((id: string) => { removeMutation.mutate(id); }, [removeMutation]);
  const handleVerify = useCallback((id: string) => { verifyMutation.mutate(id); }, [verifyMutation]);

  return (
    <Card className="rounded-lg border border-border">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Custom Domains
          </CardTitle>
          <CardDescription>Verify a custom domain for your organization portal.</CardDescription>
        </div>
        {canEdit && !showAdd && (
          <AnimatedIconButton icon={PlusIcon} iconSize={12} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleOpenAdd} className="h-8 text-xs">
            Add domain
          </AnimatedIconButton>
        )}
      </CardHeader>
      <CardContent className="pb-5 space-y-4">
        {showAdd && (
          <form onSubmit={form.handleSubmit(handleAdd)} className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Domain *</Label>
              <Input {...form.register("domain")} placeholder="app.yourcompany.com" />
              {form.formState.errors.domain && <p className="text-[11px] text-destructive">{form.formState.errors.domain.message}</p>}
            </div>
            <div className="flex gap-2">
              <LoadingButton type="submit" size="sm" isPending={addMutation.isPending} className="gap-1.5 h-8" loadingText="Adding…">
                Add
              </LoadingButton>
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={handleCancelAdd}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !domains || domains.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No custom domains added.</p>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <div key={d.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium flex-1 font-mono">{d.domain}</span>
                  {d.verifiedAt ? (
                    <Badge className="gap-1 h-5 text-[10px] bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="h-5 text-[10px]">Pending verification</Badge>
                  )}
                  {canEdit && (
                    <RemoveDomainButton domainId={d.id} onRemove={handleRemove} disabled={removeMutation.isPending} />
                  )}
                </div>
                {!d.verifiedAt && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      Add this TXT record to your DNS provider, then click Verify:
                    </p>
                    <div className="grid grid-cols-[60px_1fr] gap-1 text-[11px]">
                      <span className="font-medium text-muted-foreground">Host</span>
                      <code>@</code>
                      <span className="font-medium text-muted-foreground">Type</span>
                      <code>TXT</code>
                      <span className="font-medium text-muted-foreground">Value</span>
                      <span className="col-span-1" />
                    </div>
                    <CopyableToken token={d.verificationToken} />
                    {canEdit && (
                      <VerifyDomainButton domainId={d.id} onVerify={handleVerify} isPending={verifyMutation.isPending} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">DNS propagation can take up to 48 hours.</p>
      </CardContent>
    </Card>
  );
}
