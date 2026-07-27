"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EntityFormSheet } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTicket } from "@/hooks/api/build";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const MEANINGFUL_TEXT_RE = /[a-zA-Z0-9À-ɏЀ-ӿ一-鿿]/;

const createEpicSchema = z.object({
  title: z
    .string()
    .min(1, "Epic title is required")
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or fewer")
    .refine((v) => MEANINGFUL_TEXT_RE.test(v), "Title must contain at least one letter or number"),
  description: z.string().max(2000, "Description must be 2,000 characters or fewer").optional(),
  priority: z.enum(PRIORITIES),
});

type CreateEpicInput = z.infer<typeof createEpicSchema>;

interface CreateEpicDialogProps {
  projectId: number;
  trigger?: ReactNode;
}

export function CreateEpicDialog({ projectId, trigger }: CreateEpicDialogProps) {
  const [open, setOpen] = useState(false);
  const createTicket = useCreateTicket();

  const handleOpen = () => setOpen(true);

  const handleSubmit = (data: CreateEpicInput) => {
    createTicket.mutate(
      {
        projectId,
        title: data.title,
        description: data.description || undefined,
        type: "EPIC",
        priority: data.priority,
      },
      {
        onSuccess: () => {
          toast.success("Epic created successfully");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      },
    );
  };

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} role="button" tabIndex={0}>
          {trigger}
        </span>
      ) : (
        <AnimatedIconButton size="sm" icon={PlusIcon} iconSize={16} iconClassName="mr-2" onClick={handleOpen}>
          Create Epic
        </AnimatedIconButton>
      )}
      <EntityFormSheet<CreateEpicInput>
        open={open}
        onOpenChange={setOpen}
        title="Create new epic"
        description="A high-level feature or initiative that contains multiple stories."
        resolver={zodResolver(createEpicSchema)}
        defaultValues={{ title: "", description: "", priority: "MEDIUM" }}
        onSubmit={handleSubmit}
        isSubmitting={createTicket.isPending}
        submitLabel="Create epic"
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    Epic title
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., User Authentication System" {...field} />
                  </FormControl>
                  <FormDescription>What is the broader initiative?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {(field.value ?? "").length} / 2000
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the epic goals and scope..."
                      className="resize-none min-h-[120px]"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormSheet>
    </>
  );
}
