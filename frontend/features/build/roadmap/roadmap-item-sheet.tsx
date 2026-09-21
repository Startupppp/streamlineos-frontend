"use client";

import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { roadmapItemSchema, type RoadmapItemFormValues } from "./roadmap-schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateRoadmapItem,
  useUpdateRoadmapItem,
} from "@/hooks/api/build/roadmap";
import type { RoadmapItem } from "@/types/projects";
import { ROADMAP_STATUS_OPTIONS } from "./roadmap-constants";

interface RoadmapItemSheetProps {
  item?: RoadmapItem;
  onClose: () => void;
}

export function RoadmapItemSheet({ item, onClose }: RoadmapItemSheetProps) {
  const isEdit = !!item;
  const create = useCreateRoadmapItem();
  const update = useUpdateRoadmapItem();
  const isPending = create.isPending || update.isPending;

  const form = useForm<RoadmapItemFormValues, unknown, RoadmapItemFormValues>({
    resolver: zodResolver(roadmapItemSchema),
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      status: (["planned", "in_progress", "completed", "cancelled"] as const).find((v) => v === item?.status) ?? "planned",
      category: item?.category ?? "",
      targetQuarter: item?.targetQuarter ?? "",
      isPublic: item?.isPublic ?? true,
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSave(values: RoadmapItemFormValues) {
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      status: values.status,
      category: values.category.trim() || undefined,
      targetQuarter: values.targetQuarter.trim() || undefined,
      isPublic: values.isPublic,
    };
    if (isEdit) {
      update.mutate(
        {
          roadmapItemId: item.id,
          title: payload.title,
          description: payload.description ?? null,
          status: payload.status,
          category: payload.category ?? null,
          targetQuarter: payload.targetQuarter ?? null,
          isPublic: payload.isPublic,
        },
        {
          onSuccess: () => { toast.success("Roadmap item updated"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Roadmap item created"); onClose(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{isEdit ? "Edit Roadmap Item" : "New Roadmap Item"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Dark mode support" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROADMAP_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetQuarter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Quarter</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Q3 2026" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Integrations" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">Public</p>
                        <p className="text-xs text-muted-foreground">Show this item on the public board</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border border-border data-[state=unchecked]:bg-input"
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <LoadingButton type="submit" className="flex-1" isPending={isPending} loadingText="Saving…">
                {isEdit ? "Save Changes" : "Create Item"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
