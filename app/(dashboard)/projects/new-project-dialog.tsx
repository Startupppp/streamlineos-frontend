"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { createProject } from "@/server/actions/project-actions";
import { Plus, Check, ChevronsUpDown, User } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  key: z.string().min(2, "Key must be at least 2 characters").regex(/^[A-Z]+$/, "Key must be uppercase letters only"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const { data: employees } = api.hr.getEmployees.useQuery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      memberIds: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await createProject(values);
    if (res.success) {
      toast.success("Project created successfully");
      setOpen(false);
      form.reset();
    } else {
      toast.error(res.error || "Failed to create project");
    }
  }

  // Auto-generate key from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      form.setValue("name", name);
      // Generate key: First 3-4 letters of name, uppercase
      if (name) {
          const key = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
          form.setValue("key", key);
      }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project and assign team members.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Mobile App Redesign" {...field} onChange={handleNameChange} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                        <Input placeholder="MAR" {...field} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Project goals..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Members</FormLabel>
                  <FormControl>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between pl-3 text-left font-normal">
                                {field.value?.length && field.value.length > 0 
                                    ? `${field.value.length} members selected`
                                    : "Select members"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[460px] p-2" align="start">
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                <h4 className="font-medium leading-none mb-2 text-sm text-muted-foreground p-1">Select Employees</h4>
                                {employees?.filter(e => e.role !== "CLIENT").map((emp) => (
                                    <div key={emp.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                         onClick={() => {
                                             const current = field.value || [];
                                             const newData = current.includes(emp.id)
                                                 ? current.filter(id => id !== emp.id)
                                                 : [...current, emp.id];
                                             field.onChange(newData);
                                         }}
                                    >
                                        <Checkbox 
                                            checked={field.value?.includes(emp.id)}
                                            onCheckedChange={(checked) => {
                                                const current = field.value || [];
                                                if (checked) {
                                                    field.onChange([...current, emp.id]);
                                                } else {
                                                    field.onChange(current.filter(id => id !== emp.id));
                                                }
                                            }}
                                        />
                                        <div className="flex items-center space-x-2 flex-1">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                                {emp.name?.charAt(0) || <User className="h-3 w-3" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{emp.name}</span>
                                                <span className="text-xs text-muted-foreground">{emp.email}</span>
                                            </div>
                                        </div>
                                        {field.value?.includes(emp.id) && <Check className="h-4 w-4 text-primary" />}
                                    </div>
                                ))}
                                {!employees?.length && <div className="text-sm text-center py-4 text-muted-foreground">No employees found</div>}
                            </div>
                        </PopoverContent>
                     </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
