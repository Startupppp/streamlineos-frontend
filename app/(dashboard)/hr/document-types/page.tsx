"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  PowerOff,
  Power,
} from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";

import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAbility } from "@/lib/abilities-context";


interface DocumentType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isMandatory: boolean | null;
  isActive: boolean | null;
  sortOrder: number | null;
  applicableRoles: string[] | null;
  createdAt: string | null;
}


const ALL_ROLES = [
  "CEO",
  "HR",
  "SALES",
  "ENGINEERING",
  "DESIGN",
  "DIGITAL_MARKETING",
  "VIDEO_EDITOR",
  "CUSTOMER_SUPPORT",
];


function useDocumentTypes() {
  return useQuery<DocumentType[]>({
    queryKey: ["hr", "document-types"],
    queryFn: () => apiClient.get<DocumentType[]>("/hr/document-types"),
  });
}

function useCreateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      isMandatory: boolean;
      sortOrder?: number;
      applicableRoles: string[];
    }) => {
      return apiClient.post("/hr/document-types", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "document-types"] });
    },
  });
}

function useUpdateDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: number;
      name?: string;
      description?: string;
      isMandatory?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      applicableRoles?: string[];
    }) => {
      return apiClient.patch(`/hr/document-types/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "document-types"] });
    },
  });
}

function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch(`/hr/document-types/${id}`, { isActive: false });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr", "document-types"] });
    },
  });
}


function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}


function blankForm() {
  return {
    name: "",
    description: "",
    isMandatory: false,
    isActive: true,
    sortOrder: "",
    applicableRoles: [] as string[],
  };
}


export default function DocumentTypesPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const ability = useAbility();
  const isHROrCEO = ability.can("manage", "hr:employees");

  const { data, isLoading } = useDocumentTypes();
  const createMutation = useCreateDocumentType();
  const updateMutation = useUpdateDocumentType();
  const deleteMutation = useDeleteDocumentType();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DocumentType | null>(null);
  const [form, setForm] = useState(blankForm());

  const [deactivateTarget, setDeactivateTarget] = useState<DocumentType | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<DocumentType | null>(null);

  const setField = useCallback(
    <K extends keyof ReturnType<typeof blankForm>>(
      key: K,
      value: ReturnType<typeof blankForm>[K]
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleToggleRole = useCallback((r: string) => {
    setForm((prev) => ({
      ...prev,
      applicableRoles: prev.applicableRoles.includes(r)
        ? prev.applicableRoles.filter((x) => x !== r)
        : [...prev.applicableRoles, r],
    }));
  }, []);

  const resetAndClose = useCallback(() => {
    setSheetOpen(false);
    setEditTarget(null);
    setForm(blankForm());
  }, []);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(blankForm());
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((dt: DocumentType) => {
    setEditTarget(dt);
    setForm({
      name: dt.name,
      description: dt.description ?? "",
      isMandatory: dt.isMandatory ?? false,
      isActive: dt.isActive !== false,
      sortOrder: dt.sortOrder != null ? String(dt.sortOrder) : "",
      applicableRoles: dt.applicableRoles ?? [],
    });
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isMandatory: form.isMandatory,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : undefined,
      applicableRoles: form.applicableRoles,
    };

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...payload, isActive: form.isActive },
        {
          onSuccess: () => {
            toast.success("Document type updated");
            resetAndClose();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Document type created");
          resetAndClose();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }, [form, editTarget, createMutation, updateMutation, resetAndClose]);

  const handleDeactivate = useCallback(() => {
    if (!deactivateTarget) return;
    deleteMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        toast.success("Document type deactivated");
        setDeactivateTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deactivateTarget, deleteMutation]);

  const handleReactivate = useCallback(() => {
    if (!reactivateTarget) return;
    updateMutation.mutate(
      { id: reactivateTarget.id, isActive: true },
      {
        onSuccess: () => {
          toast.success("Document type reactivated");
          setReactivateTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [reactivateTarget, updateMutation]);


  const list = data ?? [];

  if (isLoading) {
    return (
      <PageWrapper
        title="Document Types"
        subtitle="Configure required onboarding documents"
      >
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document Types"
      subtitle="Configure required onboarding documents"
      badge={`${list.length} types`}
      actions={
        isHROrCEO ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Document Type
          </Button>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <EmptyState
          illustration={<EmptyUploadIllustration className="h-40 w-40" />}
          title="No document types configured"
          description="Add document types to define what employees must submit during onboarding."
          action={
            isHROrCEO
              ? { label: "Add Document Type", onClick: openCreate }
              : undefined
          }
        />
      ) : (
        <ScrollArea className="w-full" type="auto">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Sort Order</TableHead>
                  <TableHead>Applicable Roles</TableHead>
                  {isHROrCEO && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((dt) => (
                  <TableRow key={dt.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{dt.name}</p>
                        {dt.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {dt.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dt.isMandatory ? (
                        <Badge variant="default" className="text-[10px]">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Optional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {dt.isActive !== false ? (
                        <Badge variant="default" className="text-[10px] bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {dt.sortOrder ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(dt.applicableRoles ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">All</span>
                        ) : (
                          (dt.applicableRoles ?? []).map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="text-[9px] py-0 h-4"
                            >
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    {isHROrCEO && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(dt)}
                            aria-label={`Edit ${dt.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {dt.isActive !== false ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeactivateTarget(dt)}
                              aria-label={`Deactivate ${dt.name}`}
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-green-600"
                              onClick={() => setReactivateTarget(dt)}
                              aria-label={`Reactivate ${dt.name}`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) resetAndClose();
          else setSheetOpen(true);
        }}
        title={editTarget ? "Edit Document Type" : "Add Document Type"}
        description={
          editTarget
            ? "Update the document type configuration."
            : "Define a new document required during employee onboarding."
        }
        onSubmit={handleSubmit}
        submitLabel={editTarget ? "Save Changes" : "Create"}
        isPending={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. National ID / Aadhaar Card"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-label="Document type name"
          />
          {form.name && (
            <p className="text-[11px] text-muted-foreground">
              Slug: {slugify(form.name)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            placeholder="Brief description of what this document is..."
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={2}
            aria-label="Description"
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Mandatory Document</p>
            <p className="text-xs text-muted-foreground">
              Employees must submit this before onboarding is complete.
            </p>
          </div>
          <Switch
            checked={form.isMandatory}
            onCheckedChange={(v) => setField("isMandatory", v)}
            aria-label="Mandatory"
          />
        </div>

        {editTarget && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive types won&apos;t appear in new onboarding checklists.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setField("isActive", v)}
              aria-label="Active"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Sort Order{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 1"
            value={form.sortOrder}
            onChange={(e) => setField("sortOrder", e.target.value)}
            aria-label="Sort order"
          />
          <p className="text-[11px] text-muted-foreground">
            Lower numbers appear first in the checklist.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Applicable Roles{" "}
            <span className="text-muted-foreground font-normal">
              (leave empty = all roles)
            </span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_ROLES.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <Checkbox
                  id={`role-${r}`}
                  checked={form.applicableRoles.includes(r)}
                  onCheckedChange={() => handleToggleRole(r)}
                  aria-label={r}
                />
                <Label
                  htmlFor={`role-${r}`}
                  className="text-xs font-normal cursor-pointer"
                >
                  {r}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="Deactivate Document Type"
        description={`Are you sure you want to deactivate "${deactivateTarget?.name}"? It will no longer appear in new onboarding checklists.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={handleDeactivate}
        isPending={deleteMutation.isPending}
      />

      <ConfirmActionDialog
        open={reactivateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setReactivateTarget(null);
        }}
        title="Reactivate Document Type"
        description={`Are you sure you want to reactivate "${reactivateTarget?.name}"? It will appear again in new onboarding checklists.`}
        confirmLabel="Reactivate"
        variant="default"
        onConfirm={handleReactivate}
        isPending={updateMutation.isPending}
      />
    </PageWrapper>
  );
}
