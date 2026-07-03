"use client";

import { useState, useCallback } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useCreateProjectTemplate } from "@/hooks/api/projects";
import { TicketRow, type TicketDraft } from "./ticket-row";

const CATEGORIES = ["GENERAL", "SOFTWARE", "ONBOARDING", "MARKETING", "SALES", "HR"] as const;

interface CreateTemplateSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTemplateSheet({ open, onClose }: CreateTemplateSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [tickets, setTickets] = useState<TicketDraft[]>([
    { title: "", type: "TASK", priority: "MEDIUM", phase: "", estimatedHours: "", order: 0 },
  ]);
  const create = useCreateProjectTemplate();

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value),
    [],
  );

  const addTicket = useCallback(() => {
    setTickets((prev) => [
      ...prev,
      {
        title: "",
        type: "TASK",
        priority: "MEDIUM",
        phase: "",
        estimatedHours: "",
        order: prev.length,
      },
    ]);
  }, []);

  const removeTicket = useCallback((idx: number) => {
    setTickets((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateTicket = useCallback(
    <K extends keyof TicketDraft>(idx: number, field: K, value: TicketDraft[K]) => {
      setTickets((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
      );
    },
    [],
  );

  const handleCreate = useCallback(() => {
    if (!name.trim() || tickets.some((t) => !t.title.trim())) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        tickets: tickets.map((t, i) => ({
          title: t.title.trim(),
          type: t.type,
          priority: t.priority,
          phase: t.phase.trim() || undefined,
          estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : undefined,
          order: i,
        })),
      },
      {
        onSuccess: () => {
          toast.success("Template created");
          onClose();
        },
        onError: () => toast.error("Failed to create template"),
      },
    );
  }, [name, tickets, description, category, create, onClose]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="p-0 flex flex-col gap-0 w-full sm:max-w-lg">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>New Project Template</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-1">
              <Label>Template Name *</Label>
              <Input
                placeholder="e.g. Software Development"
                value={name}
                onChange={handleNameChange}
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              placeholder="What is this template for?"
              value={description}
              onChange={handleDescriptionChange}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Tasks ({tickets.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTicket}
                className="active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            </div>
            {tickets.map((ticket, idx) => (
              <TicketRow
                key={idx}
                ticket={ticket}
                index={idx}
                isOnlyTicket={tickets.length <= 1}
                onUpdate={updateTicket}
                onRemove={removeTicket}
              />
            ))}
          </div>
        </div>
        <div className="shrink-0 px-6 py-4 border-t">
          <div className="grid grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full active:scale-[0.98]"
              >
                Cancel
              </Button>
            </SheetClose>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={
                create.isPending ||
                !name.trim() ||
                tickets.some((t) => !t.title.trim())
              }
              className="w-full active:scale-[0.98]"
            >
              {create.isPending ? "Creating…" : "Create Template"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
