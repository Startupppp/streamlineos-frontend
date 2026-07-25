"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { spaceSchema, type SpaceFormValues } from "./spaces-page-schema";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateKbSpace, useUpdateKbSpace } from "@/hooks/api/kb/spaces";
import type { KbSpace, KbAudience } from "@/types/kb";

interface SpaceSheetProps {
  open: boolean;
  editingSpace: KbSpace | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SpaceSheet({
  open,
  editingSpace,
  onOpenChange,
  onSuccess,
}: SpaceSheetProps) {
  const createSpace = useCreateKbSpace();
  const updateSpace = useUpdateKbSpace();

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: editingSpace?.name ?? "",
      description: editingSpace?.description ?? null,
      icon: editingSpace?.icon ?? null,
      audience: (editingSpace?.audience ?? "internal") as KbAudience,
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: SpaceFormValues) {
    if (editingSpace) {
      updateSpace.mutate(
        {
          spaceId: editingSpace.id,
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          audience: values.audience,
        },
        {
          onSuccess: () => {
            toast.success("Space updated");
            form.reset();
            onSuccess();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      createSpace.mutate(
        {
          name: values.name,
          description: values.description ?? null,
          icon: values.icon ?? null,
          audience: values.audience,
        },
        {
          onSuccess: () => {
            toast.success("Space created");
            form.reset();
            onSuccess();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }

  function handleCancel() {
    form.reset();
    onOpenChange(false);
  }

  const isPending = createSpace.isPending || updateSpace.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>
            {editingSpace ? "Edit space" : "Create space"}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Space name" />
                    </FormControl>
                    <FormMessage />
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
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (emoji)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. 📚"
                        maxLength={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? "internal"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <LoadingButton type="submit" className="flex-1" isPending={isPending} loadingText="Saving…">
                {editingSpace ? "Save" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
