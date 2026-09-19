"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import { useCommandPalette } from "@/components/command-palette";
import { useCreateManagedProduct } from "@/hooks/api/build/managed-products";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CreateManagedProductInput } from "@/types/projects";
import type {
  BuildCreateAction,
  BuildCreateActionId,
} from "@/lib/build/build-nav-model";
import type { BuildScope } from "@/lib/build/build-scope";

const NewProjectDialog = dynamic(
  () =>
    import("@/features/build/project-list/new-project-dialog").then(
      (module) => module.NewProjectDialog,
    ),
  { ssr: false },
);

const ManagedProductFormSheet = dynamic(
  () =>
    import(
      "@/features/build/managed-products/managed-product-form-sheet"
    ).then((module) => module.ManagedProductFormSheet),
  { ssr: false },
);

interface BuildQuickCreateProps {
  scope: BuildScope;
  actions: BuildCreateAction[];
  isCollapsed: boolean;
  onNavigate?: () => void;
}

export function BuildQuickCreate({
  scope,
  actions,
  isCollapsed,
  onNavigate,
}: BuildQuickCreateProps) {
  const { openCreateTicket } = useCommandPalette();
  const createProduct = useCreateManagedProduct();
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectMounted, setProjectMounted] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [productMounted, setProductMounted] = useState(false);
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  const handleAction = useCallback(
    (actionId: BuildCreateActionId) => {
      onNavigate?.();
      if (actionId === "issue") {
        openCreateTicket(scope.projectId);
        return;
      }
      if (actionId === "project") {
        setProjectMounted(true);
        setProjectOpen(true);
        return;
      }
      setProductMounted(true);
      setProductOpen(true);
    },
    [openCreateTicket, scope.projectId, onNavigate],
  );

  const handleCreateProduct = useCallback(
    (input: CreateManagedProductInput) => {
      createProduct.mutate(input, {
        onSuccess: () => {
          toast.success("Product created");
          setProductOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [createProduct],
  );

  function renderAction(action: BuildCreateAction) {
    function handleSelect() {
      handleAction(action.id);
    }
    return (
      <DropdownMenuItem key={action.id} onSelect={handleSelect}>
        {action.label}
      </DropdownMenuItem>
    );
  }

  if (actions.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            {...animatedNavHoverHandlers}
            aria-label={isCollapsed ? "Create in Build" : undefined}
            className={cn(
              "h-8 w-full justify-start gap-2.5 rounded-md px-2.5 text-label font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              isCollapsed && "mx-auto h-8 w-8 justify-center px-0",
            )}
          >
            <SidebarAnimatedNavIcon
              icon={PlusIcon}
              iconRef={iconRef}
              className="h-4 w-4 shrink-0"
            />
            {isCollapsed ? null : <span>Create</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side={isCollapsed ? "right" : "bottom"}
          className="w-48"
        >
          <DropdownMenuLabel className="text-micro uppercase tracking-wider text-muted-foreground">
            Create in Build
          </DropdownMenuLabel>
          {actions.map(renderAction)}
        </DropdownMenuContent>
      </DropdownMenu>

      {projectMounted ? (
        <NewProjectDialog
          trigger={null}
          open={projectOpen}
          onOpenChange={setProjectOpen}
        />
      ) : null}

      {productMounted ? (
        <ManagedProductFormSheet
          open={productOpen}
          onOpenChange={setProductOpen}
          mode="create"
          onSubmitCreate={handleCreateProduct}
          isPending={createProduct.isPending}
        />
      ) : null}
    </>
  );
}
