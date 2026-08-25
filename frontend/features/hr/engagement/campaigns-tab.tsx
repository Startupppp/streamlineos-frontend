"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Megaphone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyCampaignsIllustration } from "@/components/illustrations";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  useEngagementCampaigns,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  type HrCampaign,
  type CreateCampaignData,
} from "@/hooks/api/hr/engagement";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

const STATUS_COLORS: Record<HrCampaign["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function CampaignsTab() {
  const { data: campaigns, isLoading } = useEngagementCampaigns();
  const canManage = useCan("hr:engagement:manage");
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HrCampaign | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<HrCampaign["status"]>("draft");

  const handleReset = useCallback(() => {
    setName("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setStatus("draft");
    setEditTarget(null);
  }, []);

  const handleEdit = useCallback((c: HrCampaign) => {
    setEditTarget(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setStartsAt(c.startsAt ? c.startsAt.slice(0, 16) : "");
    setEndsAt(c.endsAt ? c.endsAt.slice(0, 16) : "");
    setStatus(c.status);
    setSheetOpen(true);
  }, []);

  const handleSheetChange = useCallback(
    (open: boolean) => {
      if (!open) handleReset();
      setSheetOpen(open);
    },
    [handleReset],
  );

  const handleSave = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const payload: CreateCampaignData = {
      name,
      description: description || undefined,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      status,
    };
    if (editTarget) {
      toast.promise(update.mutateAsync({ id: editTarget.id, ...payload }), {
        loading: "Updating campaign...",
        success: () => { setSheetOpen(false); handleReset(); return "Campaign updated"; },
        error: getErrorMessage,
      });
    } else {
      toast.promise(create.mutateAsync(payload), {
        loading: "Creating campaign...",
        success: () => { setSheetOpen(false); handleReset(); return "Campaign created"; },
        error: getErrorMessage,
      });
    }
  }, [name, description, startsAt, endsAt, status, editTarget, create, update, handleReset]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteId) return;
    toast.promise(remove.mutateAsync(deleteId), {
      loading: "Deleting...",
      success: () => { setDeleteId(null); return "Campaign deleted"; },
      error: getErrorMessage,
    });
  }, [deleteId, remove]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleStartsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartsAt(e.target.value), []);
  const handleEndsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndsAt(e.target.value), []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="gap-1.5"
            onClick={() => setSheetOpen(true)}
          >
            New Campaign
          </AnimatedIconButton>
        </div>
      )}

      {(!campaigns || campaigns.length === 0) ? (
        <EmptyState
          illustration={<EmptyCampaignsIllustration className="h-full w-full" />}
          title="No campaigns yet"
          description="Launch your first engagement campaign to survey sentiment and drive participation."
          action={
            canManage
              ? { label: "New Campaign", onClick: () => setSheetOpen(true) }
              : undefined
          }
          className="bg-muted/20"
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Megaphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium border ${
                        STATUS_COLORS[c.status]
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  {c.description && (
                    <TruncatedText text={c.description} lines={2} className="text-xs text-muted-foreground mt-1" />
                  )}
                  {(c.startsAt || c.endsAt) && (
                    <p className="text-dense text-muted-foreground mt-1">
                      {c.startsAt && `From ${new Date(c.startsAt).toLocaleDateString()}`}
                      {c.startsAt && c.endsAt && " → "}
                      {c.endsAt && new Date(c.endsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(c)}
                      aria-label="Edit campaign"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AnimatedIconButton
                      icon={Trash2Icon}
                      iconSize={14}
                      variant="ghost"
                      size="icon"
                      className="w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(c.id)}
                      aria-label="Delete campaign"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        title={editTarget ? "Edit Campaign" : "New Campaign"}
        description="Organize an engagement campaign for your team."
        onSubmit={handleSave}
        submitLabel={editTarget ? "Save Changes" : "Create Campaign"}
        isPending={create.isPending || update.isPending}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="camp-name" className="text-xs font-medium">Name</Label>
            <Input id="camp-name" placeholder="Campaign name" value={name} onChange={handleNameChange} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-desc" className="text-xs font-medium">Description</Label>
            <Textarea id="camp-desc" placeholder="What is this campaign about?" value={description} onChange={handleDescChange} className="min-h-[80px] text-sm resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="camp-start" className="text-xs font-medium">Starts At</Label>
              <Input id="camp-start" type="datetime-local" value={startsAt} onChange={handleStartsChange} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camp-end" className="text-xs font-medium">Ends At</Label>
              <Input id="camp-end" type="datetime-local" value={endsAt} onChange={handleEndsChange} className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as HrCampaign["status"])}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </HrSheet>

      <ConfirmSheet
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        isPending={remove.isPending}
      />
    </div>
  );
}
