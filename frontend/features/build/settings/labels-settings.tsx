"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LabelCreateForm } from "@/components/labels";
import { DEFAULT_LABEL_COLOR, resolveLabelColor } from "@/components/labels/label-colors";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { useCreateOrgLabel } from "@/hooks/api/build/ticket-sub-resources";
import { useUpdateLabel, useDeleteLabel } from "@/hooks/api/build/labels";
import type { TicketLabel } from "@/types/projects";
import { LabelEditRow } from "./label-edit-row";
import { LabelsHeader, LabelListRow } from "./labels-settings-rows";

export function LabelsSettings() {
  const canManage = useCan("build:manage");
  const reduceMotion = useReducedMotion();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(DEFAULT_LABEL_COLOR);

  const {
    data: labels = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectLabels();
  const createLabel = useCreateOrgLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const resolution = usePageState({ permission: "build:view", isLoading, isError, error });

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    createLabel.mutate(
      { name: name.trim(), color: resolveLabelColor(color) },
      {
        onSuccess: () => {
          setName("");
          setColor(DEFAULT_LABEL_COLOR);
          setShowForm(false);
          toast.success("Label created");
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [name, color, createLabel]);

  const handleUpdate = useCallback(
    (label: TicketLabel) => {
      const nextName = editName.trim() || label.name;
      updateLabel.mutate(
        { labelId: label.id, name: nextName, color: resolveLabelColor(editColor) },
        {
          onSuccess: () => {
            setEditingId(null);
            toast.success("Label updated");
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [editName, editColor, updateLabel],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteLabel.mutate(id, {
        onSuccess: () => toast.success("Label deleted"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [deleteLabel],
  );

  const handleStartEdit = useCallback((label: TicketLabel) => {
    setShowForm(false);
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(resolveLabelColor(label.color));
  }, []);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setName("");
    setColor(DEFAULT_LABEL_COLOR);
  }, []);

  const handleShowForm = useCallback(() => {
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const loadingSkeleton = (
    <div>
      <LabelsHeader showAdd={false} onAdd={handleShowForm} />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-11 rounded-xl" />
        ))}
      </div>
    </div>
  );

  return (
    <PageState resolution={resolution} loading={loadingSkeleton} onRetry={handleRetry} compact>
      <div>
        <LabelsHeader showAdd={canManage && !showForm} onAdd={handleShowForm} />
        <div className="space-y-2">
          {labels.length === 0 && !showForm ? (
            <EmptyState
              compact
              illustrationPreset="tasks"
              title="No labels yet"
              description="Create a label to start organizing tickets across this organization."
              action={canManage ? { label: "Add Label", onClick: handleShowForm } : undefined}
            />
          ) : null}
          <AnimatePresence initial={false} mode="popLayout">
            {labels.map((label, index) => {
              if (canManage && editingId === label.id) {
                function handleSaveEdit() {
                  handleUpdate(label);
                }

                return (
                  <LabelEditRow
                    key={label.id}
                    name={editName}
                    color={editColor}
                    isPending={updateLabel.isPending}
                    onNameChange={setEditName}
                    onColorChange={setEditColor}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                  />
                );
              }

              return (
                <LabelListRow
                  key={label.id}
                  label={label}
                  index={index}
                  onEdit={handleStartEdit}
                  onDelete={handleDelete}
                  canManage={canManage}
                />
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {canManage && showForm ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <LabelCreateForm
                    name={name}
                    color={color}
                    onNameChange={setName}
                    onColorChange={setColor}
                    onSubmit={handleCreate}
                    onCancel={handleCancelForm}
                    isPending={createLabel.isPending}
                    submitLabel="Create"
                    loadingText="Creating…"
                    showPreview
                    fullWidthSubmit={false}
                    autoFocus
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </PageState>
  );
}
