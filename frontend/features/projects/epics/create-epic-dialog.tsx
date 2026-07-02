"use client";

import { ReactNode, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useCreateTicket } from "@/hooks/api/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const createEpicSchema = z.object({
  title: z.string().min(1, "Epic title is required"),
  description: z.string().optional(),
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
        <Button size="sm" onClick={handleOpen} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Create Epic
        </Button>
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
                    <Layers className="h-3.5 w-3.5 text-violet-500" />
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
                  <FormLabel>Description</FormLabel>
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
