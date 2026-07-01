"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, DollarSign, Percent } from "lucide-react";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  useAllowances,
  useCreateAllowance,
  useUpdateAllowance,
  useDeleteAllowance,
  type AllowanceType,
  type CreateAllowanceInput,
} from "@/hooks/api/hr/allowances";
import { getErrorMessage } from "@/lib/api-client";

type ActiveTab = "ALLOWANCE" | "DEDUCTION";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["ALLOWANCE", "DEDUCTION"]),
  formulaType: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.string().min(1, "Value is required"),
  cap: z.string().optional(),
  isTaxable: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function buildDefaultValues(category: ActiveTab): FormValues {
  return {
    name: "",
    category,
    formulaType: "FIXED",
    value: "",
    cap: "",
    isTaxable: true,
  };
}

interface AllowanceCardProps {
  item: AllowanceType;
  onEdit: (item: AllowanceType) => void;
  onDelete: (id: number) => void;
}

function AllowanceCard({ item, onEdit, onDelete }: AllowanceCardProps) {
  function handleEditClick() {
    onEdit(item);
  }

  function handleDeleteClick() {
    onDelete(item.id);
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-2xl hover:border-slate-300/80 hover:scale-[1.01]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{item.name}</h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge
              variant="secondary"
              className={
                item.formulaType === "PERCENTAGE"
                  ? "bg-violet-100 text-violet-700 border-violet-200/60 gap-1"
                  : "bg-slate-100 text-slate-600 border-slate-200/60 gap-1"
              }
            >
              {item.formulaType === "PERCENTAGE" ? (
                <Percent className="h-3 w-3" />
              ) : (
                <DollarSign className="h-3 w-3" />
              )}
              {item.formulaType}
            </Badge>
            {item.isTaxable ? (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200/60">
                Taxable
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200/60">
                Non-taxable
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <motion.div whileTap={{ scale: 0.92 }}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.92 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-slate-100 pt-2">
        <span className="font-medium text-foreground/70">
          {item.formulaType === "FIXED" ? "₹" : ""}
          {item.value ?? "—"}
          {item.formulaType === "PERCENTAGE" ? "%" : ""}
        </span>
        {item.cap && (
          <span className="text-muted-foreground">
            Cap: ₹{item.cap}
          </span>
        )}
      </div>
    </div>
  );
}

interface EmptyTabStateProps {
  category: ActiveTab;
  onAdd: () => void;
}

function EmptyTabState({ category, onAdd }: EmptyTabStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
      <div className="h-14 w-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
        <Tag className="h-7 w-7 text-violet-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          {category === "ALLOWANCE" ? "No allowances configured" : "No deductions configured"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {category === "ALLOWANCE"
            ? "Add salary allowance components to apply to employees."
            : "Add deduction components to apply to employee payroll."}
        </p>
      </div>
      <motion.div whileTap={{ scale: 0.97 }}>
        <Button
          size="sm"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {category === "ALLOWANCE" ? "Add Allowance" : "Add Deduction"}
        </Button>
      </motion.div>
    </div>
  );
}

export default function AllowancesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ALLOWANCE");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AllowanceType | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: allowances = [] } = useAllowances();
  const createMutation = useCreateAllowance();
  const updateMutation = useUpdateAllowance();
  const deleteMutation = useDeleteAllowance();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues("ALLOWANCE"),
  });

  const formulaType = form.watch("formulaType");
  const isPending = createMutation.isPending || updateMutation.isPending;

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingItem(null);
    form.reset(buildDefaultValues(activeTab));
  }, [activeTab, form]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeSheet();
    },
    [closeSheet],
  );

  const handleTabChange = useCallback((value: string) => {
    if (value === "ALLOWANCE" || value === "DEDUCTION") {
      setActiveTab(value);
    }
  }, []);

  const handleAddClick = useCallback(() => {
    setEditingItem(null);
    form.reset(buildDefaultValues(activeTab));
    setSheetOpen(true);
  }, [activeTab, form]);

  const handleEditClick = useCallback(
    (item: AllowanceType) => {
      setEditingItem(item);
      form.reset({
        name: item.name,
        category: item.category,
        formulaType: item.formulaType,
        value: item.value ?? "",
        cap: item.cap ?? "",
        isTaxable: item.isTaxable,
      });
      setSheetOpen(true);
    },
    [form],
  );

  const handleDeleteClick = useCallback((id: number) => {
    setDeletingId(id);
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeletingId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deletingId === null) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => toast.success("Component deleted"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [deletingId, deleteMutation]);

  const handleFormSubmit = useCallback(
    (values: FormValues) => {
      const payload = {
        name: values.name,
        category: values.category,
        formulaType: values.formulaType,
        value: values.value || null,
        cap: values.cap || null,
        isTaxable: values.isTaxable,
      };

      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Component updated");
              closeSheet();
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          },
        );
      } else {
        const createPayload: CreateAllowanceInput = { ...payload, isActive: true };
        createMutation.mutate(createPayload, {
          onSuccess: () => {
            toast.success("Component created");
            closeSheet();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        });
      }
    },
    [editingItem, updateMutation, createMutation, closeSheet],
  );

  const allowanceItems = allowances.filter((a) => a.category === "ALLOWANCE");
  const deductionItems = allowances.filter((a) => a.category === "DEDUCTION");

  return (
    <PageWrapper
      title="Allowances & Deductions"
      subtitle="Manage salary components for payroll computation"
      actions={
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            onClick={handleAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Component
          </Button>
        </motion.div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-5">
            <TabsTrigger value="ALLOWANCE" className="gap-2">
              Allowances
              {allowanceItems.length > 0 && (
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 leading-none">
                  {allowanceItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="DEDUCTION" className="gap-2">
              Deductions
              {deductionItems.length > 0 && (
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 leading-none">
                  {deductionItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ALLOWANCE">
            {allowanceItems.length === 0 ? (
              <EmptyTabState category="ALLOWANCE" onAdd={handleAddClick} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allowanceItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.08, ease: "easeOut" }}
                  >
                    <AllowanceCard
                      item={item}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="DEDUCTION">
            {deductionItems.length === 0 ? (
              <EmptyTabState category="DEDUCTION" onAdd={handleAddClick} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {deductionItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.08, ease: "easeOut" }}
                  >
                    <AllowanceCard
                      item={item}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? "Edit Component" : "Add Component"}</SheetTitle>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-6 space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. House Rent Allowance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                        <SelectItem value="DEDUCTION">Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="formulaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formula Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {formulaType === "PERCENTAGE" ? "Percentage (%)" : "Amount (₹)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={formulaType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cap Amount (₹) — optional</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Maximum cap in INR"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isTaxable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                    <div>
                      <FormLabel className="cursor-pointer text-sm font-medium">Taxable</FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Include this component in taxable income
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <SheetFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeSheet}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isPending ? "Saving…" : editingItem ? "Update" : "Create"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deletingId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Component</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the component. It will no longer appear in new payroll runs.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
