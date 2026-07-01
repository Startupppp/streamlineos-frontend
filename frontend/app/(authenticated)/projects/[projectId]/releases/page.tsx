"use client";

import { use, useState, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, Plus, Edit2, Trash2, Calendar, Package, Archive, CheckCircle2 } from "lucide-react";
import {
  useReleases,
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  type Release,
} from "@/hooks/api/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format } from "date-fns";

const releaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "released", "archived"]),
  releaseDate: z.string().optional(),
});

type ReleaseFormValues = z.infer<typeof releaseSchema>;

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    Icon: Package,
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    iconClass: "text-slate-400",
  },
  released: {
    label: "Released",
    Icon: CheckCircle2,
    badgeClass: "bg-green-50 text-green-700 border-green-200",
    iconClass: "text-green-500",
  },
  archived: {
    label: "Archived",
    Icon: Archive,
    badgeClass: "bg-gray-100 text-gray-500 border-gray-200",
    iconClass: "text-gray-400",
  },
} as const;

function ReleaseDialog({
  projectId,
  release,
  onClose,
}: {
  projectId: number;
  release?: Release;
  onClose: () => void;
}) {
  const isEdit = !!release;
  const create = useCreateRelease(projectId);
  const update = useUpdateRelease(projectId);
  const isPending = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      name: release?.name ?? "",
      version: release?.version ?? "",
      description: release?.description ?? "",
      status: release?.status ?? "draft",
      releaseDate: release?.releaseDate
        ? release.releaseDate.split("T")[0]
        : "",
    },
  });

  const onSubmit = useCallback(
    (values: ReleaseFormValues) => {
      const payload = {
        name: values.name,
        version: values.version,
        description: values.description || null,
        status: values.status,
        releaseDate: values.releaseDate || null,
      };
      if (isEdit) {
        update.mutate(
          { releaseId: release.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Release updated");
              onClose();
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        create.mutate(payload, {
          onSuccess: () => {
            toast.success("Release created");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [isEdit, release, update, create, onClose],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Release" : "New Release"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input placeholder="e.g. Beta Launch" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Version *</Label>
                <Input placeholder="e.g. v1.2.0" {...register("version")} />
                {errors.version && (
                  <p className="text-xs text-destructive">{errors.version.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="What's in this release?" {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Release Date</Label>
                <Input type="date" {...register("releaseDate")} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Release"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseCard({
  release,
  onEdit,
  onDelete,
}: {
  release: Release;
  onEdit: (r: Release) => void;
  onDelete: (r: Release) => void;
}) {
  const cfg = STATUS_CONFIG[release.status];
  const handleEdit = useCallback(() => onEdit(release), [onEdit, release]);
  const handleDelete = useCallback(() => onDelete(release), [onDelete, release]);

  return (
    <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <cfg.Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.iconClass}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-slate-800 truncate">{release.name}</p>
                  <span className="font-mono text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                    {release.version}
                  </span>
                </div>
                {release.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {release.description}
                  </p>
                )}
              </div>
              <Badge
                className={`text-[10px] border shrink-0 ${cfg.badgeClass}`}
                variant="outline"
              >
                {cfg.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {release.releaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(release.releaseDate), "MMM d, yyyy")}
                  </span>
                )}
                {release.ticketCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {release.ticketCount} ticket{release.ticketCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleEdit}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReleasesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  const { data: releases, isLoading, isError, refetch } = useReleases(projectId);
  const deleteRelease = useDeleteRelease(projectId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Release | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Release | null>(null);

  const releasedCount = releases?.filter((r) => r.status === "released").length ?? 0;
  const total = releases?.length ?? 0;

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseCreate = useCallback(() => setCreateOpen(false), []);
  const handleEditTarget = useCallback((r: Release) => setEditTarget(r), []);
  const handleCloseEdit = useCallback(() => setEditTarget(null), []);
  const handleDeleteTarget = useCallback((r: Release) => setDeleteTarget(r), []);

  const handleDeleteAlertChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRelease.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Release deleted");
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [deleteTarget, deleteRelease]);

  return (
    <PageWrapper
      title="Releases"
      subtitle="Track versions and shipped work"
      actions={
        <Button
          size="sm"
          onClick={handleOpenCreate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Release
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
          <p className="text-sm text-destructive font-medium">Failed to load releases</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : releases && releases.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {releasedCount}/{total} released
          </p>
          <AnimatePresence initial={false}>
            <div className="space-y-3">
              {releases.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  transition={{ delay: idx * 0.06, duration: 0.22, ease: "easeOut" }}
                >
                  <ReleaseCard
                    release={r}
                    onEdit={handleEditTarget}
                    onDelete={handleDeleteTarget}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[300px] py-16 text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Tag className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700">No releases yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first release to start tracking shipped work.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreate}
            className="mt-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add first release
          </Button>
        </div>
      )}

      {createOpen && (
        <ReleaseDialog projectId={projectId} onClose={handleCloseCreate} />
      )}
      {editTarget && (
        <ReleaseDialog
          projectId={projectId}
          release={editTarget}
          onClose={handleCloseEdit}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteAlertChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete release?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name} {deleteTarget?.version}&rdquo; will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
