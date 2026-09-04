"use client";

import { type ChangeEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { planningStartPickerProps, planningEndPickerProps } from "@/lib/date-constraints";

export interface CreateGoalForm {
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  targetValue: string;
  unit: string;
  userId: string;
}

interface CreateGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateGoalForm;
  isPending: boolean;
  onTitleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (v: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onTargetValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onUnitChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onUserIdChange: (value: string) => void;
  onCreate: () => void;
}

export function CreateGoalSheet({
  open,
  onOpenChange,
  form,
  isPending,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onStartDateChange,
  onEndDateChange,
  onTargetValueChange,
  onUnitChange,
  onUserIdChange,
  onCreate,
}: CreateGoalSheetProps) {
  const goalStartBounds = planningStartPickerProps();
  const goalEndBounds = planningEndPickerProps({
    startDate: form.startDate,
    mode: "after",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left gap-1">
          <SheetTitle>Create Goal</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Title *</Label>
            <Input
              value={form.title}
              onChange={onTitleChange}
              placeholder="Goal title"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              value={form.description}
              onChange={onDescriptionChange}
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type</Label>
            <Select value={form.type} onValueChange={onTypeChange}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OKR">OKR</SelectItem>
                <SelectItem value="STRETCH">Stretch</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Start Date *</Label>
              <DatePicker
                value={form.startDate}
                onChange={onStartDateChange}
                placeholder="Pick a date"
                className="text-sm"
                fromDate={goalStartBounds.fromDate}
                fromYear={goalStartBounds.fromYear}
                toYear={goalStartBounds.toYear}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">End Date *</Label>
              <DatePicker
                value={form.endDate}
                onChange={onEndDateChange}
                placeholder="Pick a date"
                className="text-sm"
                fromDate={goalEndBounds.fromDate}
                fromYear={goalEndBounds.fromYear}
                toYear={goalEndBounds.toYear}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Target Value</Label>
              <Input
                className="text-sm"
                value={form.targetValue}
                onChange={onTargetValueChange}
                placeholder="e.g. 100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Unit</Label>
              <Input
                className="text-sm"
                value={form.unit}
                onChange={onUnitChange}
                placeholder="e.g. %"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Assignee</Label>
            <UserCombobox
              value={form.userId}
              onChange={onUserIdChange}
              placeholder="Select assignee"
            />
          </div>
          <LoadingButton
            className="w-full"
            onClick={onCreate}
            isPending={isPending}
            loadingText="Creating…"
          >
            Create Goal
          </LoadingButton>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
