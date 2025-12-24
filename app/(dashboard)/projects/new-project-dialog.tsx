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
        <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-lg">
        <div className="bg-muted/40 p-6 pb-4 border-b">
            <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">Create Project</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1.5">
                    Launch a new initiative and assemble your team.
                </DialogDescription>
            </DialogHeader>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6 pt-4">
            <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">Project Name</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="e.g. Website Redesign" 
                                    className="h-10" 
                                    {...field} 
                                    onChange={handleNameChange} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {/* Key is hidden but auto-generated */}
                <FormField
                    control={form.control}
                    name="key"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl>
                                <Input {...field} />
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
                            <FormLabel className="text-sm font-medium">Description <span className="text-muted-foreground font-normal ml-1">(Optional)</span></FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="Briefly describe the project goals..." 
                                    className="resize-none min-h-[100px]" 
                                    {...field} 
                                />
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
                            <FormLabel className="text-sm font-medium">Team Customization</FormLabel>
                            <FormControl>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-10 px-3 font-normal text-muted-foreground hover:text-foreground">
                                            {field.value?.length && field.value.length > 0 
                                                ? <span className="text-foreground font-medium">{field.value.length} members added</span>
                                                : <span>Assign team members...</span>}
                                            <User className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0" align="start">
                                        <div className="p-3 border-b bg-muted/40">
                                            <h4 className="font-medium text-sm">Select Team Members</h4>
                                        </div>
                                        <div className="p-2 space-y-1 max-h-[240px] overflow-y-auto">
                                            {employees?.filter(e => e.role !== "CLIENT").map((emp) => {
                                                const isSelected = field.value?.includes(emp.id);
                                                return (
                                                    <div key={emp.id} 
                                                         onClick={() => {
                                                             const current = field.value || [];
                                                             const newData = isSelected
                                                                 ? current.filter(id => id !== emp.id)
                                                                 : [...current, emp.id];
                                                             field.onChange(newData);
                                                         }}
                                                         className={cn(
                                                             "flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors",
                                                             isSelected ? "bg-primary/10" : "hover:bg-muted"
                                                         )}
                                                    >
                                                        <Checkbox 
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const current = field.value || [];
                                                                if (checked) {
                                                                    field.onChange([...current, emp.id]);
                                                                } else {
                                                                    field.onChange(current.filter(id => id !== emp.id));
                                                                }
                                                            }}
                                                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        />
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                                                    {emp.name?.charAt(0) || <User className="h-4 w-4" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className={cn("text-sm font-medium", isSelected && "text-primary")}>{emp.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{emp.email}</span>
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check className="h-4 w-4 text-primary animate-in fade-in zoom-in" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {!employees?.length && <div className="text-sm text-center py-6 text-muted-foreground">No employees available</div>}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter className="pt-2">
               <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[120px]">
                  {form.formState.isSubmitting ? "Creating..." : "Create Project"}
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
