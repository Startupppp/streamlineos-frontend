"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateTalentPool } from "@/hooks/api/hr/recruitment";
import {
  createPoolSchema,
  emptyPoolValues,
  parseTags,
  type CreatePoolValues,
} from "./create-pool-schema";

export function CreatePoolSheet() {
  const [open, setOpen] = useState(false);
  const createPool = useCreateTalentPool();

  const form = useForm<CreatePoolValues>({
    resolver: zodResolver(createPoolSchema),
    defaultValues: emptyPoolValues(),
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) form.reset(emptyPoolValues());
    },
    [form],
  );

  const handleCancel = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const handleSubmit = form.handleSubmit((values) => {
    createPool.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        tags: parseTags(values.tags),
      },
      {
        onSuccess: () => {
          toast.success("Talent pool created");
          handleOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <AnimatedIconButton icon={PlusIcon} iconSize={14} size="sm" className="gap-1.5">
          New Pool
        </AnimatedIconButton>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <SheetTitle className="text-base font-semibold">New Talent Pool</SheetTitle>
          <SheetDescription className="text-xs">
            Group candidates for future roles or ongoing sourcing.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-4 py-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Future Engineers" {...field} />
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
                      <Textarea placeholder="What's this pool for?" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="java, bengaluru, 2026 grads" {...field} />
                    </FormControl>
                    
                    <p className="text-xs text-muted-foreground">
                      Comma separated. Lowercased and deduplicated when saved.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button type="button" variant="outline" className="flex-1 h-9" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                className="flex-1 h-9"
                isPending={createPool.isPending}
                loadingText="Creating…"
              >
                Create Pool
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
