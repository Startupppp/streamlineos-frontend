"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApplyProjectTemplate, type ProjectTemplate } from "@/hooks/api/projects";

interface ApplyTemplateDialogProps {
  template: ProjectTemplate;
  onClose: () => void;
}

export function ApplyTemplateDialog({ template, onClose }: ApplyTemplateDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(
    `${template.name} — ${new Date().toLocaleDateString()}`,
  );
  const [description, setDescription] = useState(template.description ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const apply = useApplyProjectTemplate();

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value),
    [],
  );
  const handleStartDateChange = useCallback(
    (value: string) => setStartDate(value),
    [],
  );
  const handleEndDateChange = useCallback(
    (value: string) => setEndDate(value),
    [],
  );

  const handleApply = useCallback(() => {
    if (!name.trim()) return;
    apply.mutate(
      {
        templateId: template.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Project "${name}" created with ${data.ticketsCreated} tasks! Key: ${data.key}`,
          );
          onClose();
          router.push(`/projects/${data.projectId}`);
        },
        onError: () => toast.error("Failed to create project"),
      },
    );
  }, [name, description, startDate, endDate, template.id, apply, onClose, router]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply &ldquo;{template.name}&rdquo;</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Project Name *</Label>
            <Input value={name} onChange={handleNameChange} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={handleDescriptionChange}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <DatePicker value={startDate} onChange={handleStartDateChange} placeholder="Pick a date" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <DatePicker value={endDate} onChange={handleEndDateChange} placeholder="Pick a date" className="h-8 text-sm" />
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p className="font-medium">
              {template.tickets.length} tasks will be created:
            </p>
            {template.tickets.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Badge variant="outline" className="text-[10px]">
                  {t.type}
                </Badge>
                <span className="truncate">{t.title}</span>
                {t.phase && (
                  <span className="text-[10px] bg-muted rounded px-1 shrink-0">
                    {t.phase}
                  </span>
                )}
              </div>
            ))}
            {template.tickets.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{template.tickets.length - 5} more
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="active:scale-[0.98]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={apply.isPending || !name.trim()}
            className="active:scale-[0.98]"
          >
            {apply.isPending ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
