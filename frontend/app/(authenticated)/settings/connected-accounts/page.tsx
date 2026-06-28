"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signIn } from "next-auth/react";
import { apiClient } from "@/lib/api-client";

type ConnectedAccount = {
  provider: string;
  providerAccountId: string;
};

const SUPPORTED_PROVIDERS = [
  {
    id: "google",
    label: "Google",
    envFlag: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: "microsoft-entra-id",
    label: "Microsoft",
    envFlag: process.env.NEXT_PUBLIC_MICROSOFT_ENABLED,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 21 21" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
    ),
  },
] as const;

function useConnectedAccounts() {
  return useQuery<ConnectedAccount[]>({
    queryKey: ["connected-accounts"],
    queryFn: () => apiClient.get<ConnectedAccount[]>("/me/connected-accounts"),
  });
}

function useUnlinkAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      apiClient.delete<{ success: boolean }>("/me/connected-accounts", { provider }),
    onSuccess: () => {
      toast.success("Account unlinked");
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

function useLinkAccount() {
  return useMutation({
    mutationFn: (provider: string) =>
      signIn(provider, { callbackUrl: "/settings/connected-accounts" }),
    onError: () => {
      toast.error("Failed to connect account");
    },
  });
}

export default function ConnectedAccountsPage() {
  const { data: connected, isLoading } = useConnectedAccounts();
  const unlinkMutation = useUnlinkAccount();
  const linkMutation = useLinkAccount();

  const connectedSet = new Set(connected?.map((a) => a.provider) ?? []);
  const visibleProviders = SUPPORTED_PROVIDERS.filter((p) => p.envFlag);

  return (
    <PageWrapper title="Connected Accounts" subtitle="Manage your linked sign-in providers">
      <div className="max-w-2xl space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : visibleProviders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No OAuth providers are configured on this platform.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Sign-in providers</CardTitle>
              <CardDescription>
                Connect a provider to enable one-click sign-in without a password.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {visibleProviders.map((provider) => {
                const isConnected = connectedSet.has(provider.id);
                const isOnlyConnected = connected?.length === 1 && isConnected;
                const isUnlinking =
                  unlinkMutation.isPending && unlinkMutation.variables === provider.id;
                const isLinking =
                  linkMutation.isPending && linkMutation.variables === provider.id;

                return (
                  <div key={provider.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="h-9 w-9 rounded-full border border-border flex items-center justify-center shrink-0 bg-muted/50">
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{provider.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        {isConnected ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Connected
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-muted-foreground/50" />
                            Not connected
                          </>
                        )}
                      </p>
                    </div>
                    {isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                        disabled={isOnlyConnected || isUnlinking}
                        onClick={() => unlinkMutation.mutate(provider.id)}
                        title={isOnlyConnected ? "Cannot unlink the only connected account" : undefined}
                      >
                        {isUnlinking && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Unlink
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLinking}
                        onClick={() => linkMutation.mutate(provider.id)}
                      >
                        {isLinking && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                        Connect
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
