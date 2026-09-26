"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, ExternalLink, GitBranch } from "lucide-react";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireModule } from "@/components/auth/require-module";
import {
  useGitConnections,
  useCreateGitConnection,
  useUpdateGitConnection,
  useDeleteGitConnection,
  type GitConnection,
  type GitProvider,
  type CreatedGitConnection,
} from "@/hooks/api/git-integration";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { ProviderIcon, ConnectionRow } from "./git-connection-row";
import { CreatedSecretDialog } from "./git-created-secret-dialog";
import { SetupInstructions } from "./git-setup-instructions";
import {
  gitConnectionSchema,
  type GitConnectionFormValues,
} from "./git-connection-schema";

type IntegrationsTab = "connections" | "agent";

const PROVIDERS: { value: GitProvider; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "gitlab", label: "GitLab" },
  { value: "bitbucket", label: "Bitbucket" },
];

function AddConnectionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      Add connection
    </Button>
  );
}

export function ProjectsGitIntegrationSettings({ footer }: { footer?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listFilters = useBuildListFilters({ searchParam: "search" });
  const {
    data: connections,
    isLoading,
    isError,
    refetch,
  } = useGitConnections({
    search: listFilters.debouncedSearch.trim() || undefined,
  });
  const createConnection = useCreateGitConnection();
  const updateConnection = useUpdateGitConnection();
  const deleteConnection = useDeleteGitConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [created, setCreated] = useState<CreatedGitConnection | null>(null);

  const gitForm = useForm<GitConnectionFormValues>({
    resolver: zodResolver(gitConnectionSchema),
    defaultValues: { provider: "github", repoUrl: "", repoName: "" },
  });
  useRegisterDirtyState(dialogOpen && gitForm.formState.isDirty);

  const selectedProvider = gitForm.watch("provider");

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) gitForm.reset();
    },
    [gitForm],
  );

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleCreate = useCallback((values: GitConnectionFormValues) => {
    createConnection.mutate(
      { provider: values.provider, repoUrl: values.repoUrl.trim(), repoName: values.repoName.trim() || undefined },
      {
        onSuccess: (data) => {
          toast.success("Connection created");
          setDialogOpen(false);
          gitForm.reset();
          setCreated(data);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [createConnection, gitForm]);

  const handleToggle = useCallback(
    (connection: GitConnection) => {
      updateConnection.mutate(
        { connectionId: connection.id, isActive: !connection.isActive },
        {
          onSuccess: () =>
            toast.success(
              connection.isActive
                ? "Connection paused"
                : "Connection activated",
            ),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updateConnection],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId === null) return;
    deleteConnection.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Connection deleted");
        setDeleteId(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteId, deleteConnection]);

  const handleCancelDialog = useCallback(() => handleDialogChange(false), [handleDialogChange]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleCloseCreated = useCallback(() => setCreated(null), []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const rawSection = searchParams.get("section");
  const activeTab: IntegrationsTab =
    rawSection === "agent" && footer != null ? "agent" : "connections";

  const handleTabChange = useCallback(
    (value: string) => {
      if (value !== "connections" && value !== "agent") return;
      const params = new URLSearchParams(searchParams.toString());
      if (value === "connections") {
        params.delete("section");
      } else {
        params.set("section", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const filteredConnections = connections?.data ?? [];

  const handleOpenConnection = useCallback((_index: number) => {}, []);
  const handleClearConnectionSelection = useCallback(() => setDeleteId(null), []);
  useBuildListKeyboard({
    itemCount: filteredConnections.length,
    onOpen: handleOpenConnection,
    onCreate: isOnline ? handleOpenDialog : undefined,
    onClearSelection: handleClearConnectionSelection,
    onShortcutHelp: handleShortcutHelp,
    searchInputRef,
    enabled: !isLoading && !isError,
  });

  return (
    <RequireModule module="build">
      <PageWrapper
        title="Integrations"
        subtitle="Connect Git repositories to link commits and pull requests to tickets"
        actions={
          activeTab === "connections" && isOnline ? (
            <AddConnectionButton onClick={handleOpenDialog} />
          ) : null
        }
      >
        <PmPageShell className="flex-none overflow-visible">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="flex flex-col gap-0"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="connections">
                <GitBranch className="h-3.5 w-3.5" />
                Connections
              </TabsTrigger>
              {footer ? (
                <TabsTrigger value="agent">
                  <Bot className="h-3.5 w-3.5" />
                  Agent access
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="connections" className="mt-0">
              <BuildListToolbar
                className="mb-4"
                search={{
                  value: listFilters.search,
                  onValueChange: listFilters.setSearch,
                  placeholder: "Search connections…",
                  inputRef: searchInputRef,
                }}
                onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
              />
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <ErrorState
                  className={PM_FILL_PANEL}
                  title="Could not load connections"
                  description="There was a problem loading your Git connections."
                  onRetry={handleRetry}
                />
              ) : filteredConnections.length === 0 ? (
                !isOnline ? (
                  <EmptyState
                    className={PM_FILL_PANEL}
                    illustration={<EmptyDevicesIllustration />}
                    title="You are offline"
                    description="Git connections cannot be modified while offline."
                  />
                ) : (
                  <EmptyState
                    className={PM_FILL_PANEL}
                    illustration={<EmptyDevicesIllustration />}
                    title={listFilters.isFiltered ? "No matching connections" : "No repositories connected"}
                    description={listFilters.isFiltered ? undefined : "Connect GitHub, GitLab, or Bitbucket to link commits and PRs to your tickets."}
                    filtersActive={listFilters.isFiltered}
                    onClearFilters={listFilters.isFiltered ? listFilters.clearAll : undefined}
                    action={!listFilters.isFiltered ? { label: "Add connection", onClick: handleOpenDialog } : undefined}
                  />
                )
              ) : (
                <PmStaggerList className="space-y-3">
                  {filteredConnections.map((connection) => (
                    <ConnectionRow
                      key={connection.id}
                      connection={connection}
                      onToggle={handleToggle}
                      onDelete={setDeleteId}
                      isToggling={updateConnection.isPending}
                    />
                  ))}
                </PmStaggerList>
              )}
            </TabsContent>

            {footer ? (
              <TabsContent value="agent" className="mt-0">
                {footer}
              </TabsContent>
            ) : null}
          </Tabs>
        </PmPageShell>

        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
              <DialogTitle>Add Git connection</DialogTitle>
              <DialogDescription>
                We generate a webhook URL and secret for you to paste into your repository.
              </DialogDescription>
            </DialogHeader>
            <Form {...gitForm}>
              <form
                onSubmit={gitForm.handleSubmit(handleCreate)}
                className="flex min-h-0 flex-1 flex-col"
              >
                <DialogBody className="space-y-4 px-6 py-2">
                  <FormField
                    control={gitForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROVIDERS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                <span className="flex items-center gap-2">
                                  <ProviderIcon provider={p.value} className="h-4 w-4" />
                                  {p.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gitForm.control}
                    name="repoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="relative">
                            <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input {...field} className="pl-9" placeholder="https://github.com/org/repo" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gitForm.control}
                    name="repoName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display name (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="org/repo" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  {selectedProvider === "github" ? (
                    <SetupInstructions
                      compact
                      className="rounded-lg border border-border/60 bg-muted/20 p-3"
                    />
                  ) : null}
                </DialogBody>
                <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
                  <Button type="button" variant="outline" onClick={handleCancelDialog}>
                    Cancel
                  </Button>
                  <LoadingButton type="submit" isPending={createConnection.isPending} loadingText="Creating…">
                    Create connection
                  </LoadingButton>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {created ? (
          <CreatedSecretDialog created={created} onClose={handleCloseCreated} />
        ) : null}

        <ConfirmDialog
          open={deleteId !== null}
          onOpenChange={handleDeleteDialogChange}
          title="Delete connection?"
          description="The webhook will stop linking commits and pull requests. Existing links are kept. This action cannot be undone."
          confirmLabel="Delete"
          destructive
          onConfirm={handleConfirmDelete}
        />

        <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
      </PageWrapper>
    </RequireModule>
  );
}
