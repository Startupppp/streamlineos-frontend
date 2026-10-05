"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bot, GitBranch } from "lucide-react";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequireModule } from "@/components/auth/require-module";
import {
  useGitConnections,
  useCreateGitConnection,
  useUpdateGitConnection,
  useDeleteGitConnection,
  type GitConnection,
  type CreatedGitConnection,
} from "@/hooks/api/git-integration";
import { type GitConnectionFormValues } from "./git-connection-schema";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell } from "@/components/pm-chrome";
import { CreatedSecretDialog } from "./git-created-secret-dialog";
import { GitConnectionDialog, AddConnectionButton } from "./git-connection-dialog";
import { GitConnectionsContent } from "./git-connections-content";

type IntegrationsTab = "connections" | "agent";

export function ProjectsGitIntegrationSettings({
  footer,
}: {
  footer?: ReactNode;
}) {
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

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleCreate = useCallback(
    (values: GitConnectionFormValues) => {
      createConnection.mutate(
        {
          provider: values.provider,
          repoUrl: values.repoUrl.trim(),
          repoName: values.repoName.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            toast.success("Connection created");
            setDialogOpen(false);
            setCreated(data);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createConnection],
  );

  const handleToggle = useCallback(
    (connection: GitConnection) => {
      updateConnection.mutate(
        { connectionId: connection.id, isActive: !connection.isActive },
        {
          onSuccess: () =>
            toast.success(
              connection.isActive ? "Connection paused" : "Connection activated",
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

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  const handleCloseCreated = useCallback(() => setCreated(null), []);
  const handleShortcutHelp = useCallback(() => setShortcutHelpOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenConnection = useCallback((_index: number) => {}, []);
  const handleClearConnectionSelection = useCallback(
    () => setDeleteId(null),
    [],
  );

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
              <GitConnectionsContent
                isLoading={isLoading}
                isError={isError}
                isOnline={isOnline}
                isFiltered={listFilters.isFiltered}
                connections={filteredConnections}
                searchValue={listFilters.search}
                onSearchChange={listFilters.setSearch}
                searchInputRef={searchInputRef}
                activeFilterCount={listFilters.activeCount}
                onClearFilters={listFilters.clearAll}
                onOpenDialog={handleOpenDialog}
                onToggle={handleToggle}
                onDelete={setDeleteId}
                isToggling={updateConnection.isPending}
                onRetry={handleRetry}
              />
            </TabsContent>

            {footer ? (
              <TabsContent value="agent" className="mt-0">
                {footer}
              </TabsContent>
            ) : null}
          </Tabs>
        </PmPageShell>

        <GitConnectionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          isPending={createConnection.isPending}
          onSubmit={handleCreate}
        />

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

        <ShortcutHelpDialog
          open={shortcutHelpOpen}
          onOpenChange={setShortcutHelpOpen}
        />
      </PageWrapper>
    </RequireModule>
  );
}
