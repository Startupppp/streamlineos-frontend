"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/api/crm/products";
import { toast } from "sonner";
import type { Product } from "@/types/crm/products";

const productSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z
    .string()
    .min(1, "Price required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Price must be greater than 0"),
  currency: z.enum(["USD", "EUR", "GBP", "INR"]),
  taxRate: z.string(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const defaultValues: ProductFormValues = {
  name: "",
  description: "",
  sku: "",
  category: "",
  unitPrice: "0",
  currency: "USD",
  taxRate: "0",
};

export default function ProductCatalogPage() {
  const { data, isLoading, isError, refetch } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const allProducts = (data as { products?: Product[] })?.products ?? [];
  const filteredProducts = search
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : allProducts;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true);
    setEditTarget(null);
    form.reset(defaultValues);
  }, [form]);

  const handleOpenEdit = useCallback(
    (product: Product) => {
      setEditTarget(product);
      setCreateOpen(false);
      form.reset({
        name: product.name,
        description: product.description ?? "",
        sku: product.sku ?? "",
        category: product.category ?? "",
        unitPrice: String(product.unitPrice),
        currency: product.currency as ProductFormValues["currency"],
        taxRate: String(product.taxRate),
      });
    },
    [form]
  );

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCreateOpen(false);
      setEditTarget(null);
    }
  }, []);

  const handleDialogClose = useCallback(() => handleDialogOpenChange(false), [handleDialogOpenChange]);

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTargetId(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteProduct.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Product deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(err.message);
        setDeleteTargetId(null);
      },
    });
  }, [deleteProduct, deleteTargetId]);

  const handleAlertOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleDeleteCancel();
    },
    [handleDeleteCancel]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onFormSubmit = useCallback(
    (data: ProductFormValues) => {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        sku: data.sku || undefined,
        category: data.category || undefined,
        unitPrice: parseFloat(data.unitPrice),
        currency: data.currency,
        taxRate: parseFloat(data.taxRate) || 0,
      };
      if (editTarget) {
        updateProduct.mutate(
          { id: editTarget.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Product updated");
              setEditTarget(null);
              form.reset();
            },
            onError: (err) => toast.error(err.message),
          }
        );
      } else {
        createProduct.mutate(payload, {
          onSuccess: () => {
            toast.success("Product created");
            setCreateOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        });
      }
    },
    [editTarget, updateProduct, createProduct, form]
  );

  const isDialogOpen = createOpen || editTarget !== null;
  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <>
      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={handleAlertOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This product will be permanently deleted and removed from all
              quotes and deals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onFormSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Enterprise License" />
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
                        placeholder="Optional description"
                        rows={2}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. ENT-001" />
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
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Software, Services"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <PageWrapper
        title="Product Catalog"
        subtitle="Manage products and services for quotes"
        actions={
          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
      >
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-1 items-center justify-center py-14">
                <EmptyState
                  illustration={
                    <Package className="h-10 w-10 text-muted-foreground" />
                  }
                  title="Failed to load products"
                  description="Something went wrong. Please try again."
                  action={{ label: "Retry", onClick: handleRetry }}
                />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-14">
                <EmptyState
                  illustration={
                    <Package className="h-10 w-10 text-muted-foreground" />
                  }
                  title={
                    search ? "No products match your search" : "No products yet"
                  }
                  description={
                    search
                      ? "Try a different search term."
                      : "Add products and services to use in your quotes and deals."
                  }
                  action={
                    search
                      ? undefined
                      : { label: "Add Product", onClick: handleOpenCreate }
                  }
                />
              </div>
            ) : (
              <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Tax Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          onEdit={handleOpenEdit}
                          onDeleteRequest={handleDeleteRequest}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  );
}

interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDeleteRequest: (id: number) => void;
}

function ProductRow({ product, onEdit, onDeleteRequest }: ProductRowProps) {
  const handleEdit = useCallback(() => onEdit(product), [product, onEdit]);
  const handleDelete = useCallback(
    () => onDeleteRequest(product.id),
    [product.id, onDeleteRequest]
  );

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-sm">{product.name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {product.description}
          </p>
        )}
      </TableCell>
      <TableCell>
        {product.sku ? (
          <span className="font-mono text-xs">{product.sku}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm">{product.category ?? "—"}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {product.currency} {product.unitPrice.toLocaleString()}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm">{product.taxRate}%</span>
      </TableCell>
      <TableCell>
        {product.isActive ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            Active
          </Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">
            Inactive
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            aria-label="Edit product"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
            aria-label="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
