"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { Filter } from "lucide-react";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  EmptyWarehouseIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/shared";
import { toast } from "sonner";
import { staggerContainer } from "@/lib/motion-variants";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useWarehouses,
  useCreateWarehouse,
} from "@/hooks/api/inventory/warehouses";
import type { WarehouseListFilters } from "@/hooks/api/inventory/warehouses";
import { getErrorMessage } from "@/lib/get-error-message";
import { WarehouseCard } from "@/features/inventory/components/warehouse-card";

const WAREHOUSE_NAME_RE = /^[\p{L}\p{N}\s\-&.,()'/]+$/u;
const WAREHOUSE_CODE_RE = /^[A-Z0-9][A-Z0-9\-_]*$/;
const ADDRESS_SAFE_RE = /^[\p{L}\p{N}\s\-.,#/()']+$/u;
const GEO_SAFE_RE = /^[\p{L}\p{N}\s\-.,'()]+$/u;

const createWarehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(100, "Name must be 100 characters or fewer")
    .regex(WAREHOUSE_NAME_RE, "Name contains unsupported characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(20, "Code must be 20 characters or fewer")
    .regex(
      WAREHOUSE_CODE_RE,
      "Code must be uppercase letters/numbers, e.g. WH-001",
    ),
  address: z
    .string()
    .trim()
    .max(255, "Address must be 255 characters or fewer")
    .regex(ADDRESS_SAFE_RE, "Address contains unsupported characters")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(100, "City must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "City contains unsupported characters")
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(100, "State must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "State contains unsupported characters")
    .optional()
    .or(z.literal("")),
  country: z
    .string()
    .trim()
    .max(100, "Country must be 100 characters or fewer")
    .regex(GEO_SAFE_RE, "Country contains unsupported characters")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
});

type CreateWarehouseValues = z.infer<typeof createWarehouseSchema>;

function WarehousesLoading() {
  return (
    <PageWrapper title="Warehouses">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-6 w-8 ml-auto" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}

export default function WarehousesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const statusValue = (searchParams.get("status") ??
    "all") as WarehouseListFilters["status"];
  const isDefaultFilter = searchParams.get("isDefault");
  const countryFilter = searchParams.get("country") ?? "";
  const cityFilter = searchParams.get("city") ?? "";

  const [localSearch, setLocalSearch] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(localSearch, 350);

  const filters = useMemo<WarehouseListFilters>(
    () => ({
      q: debouncedSearch || undefined,
      status: statusValue !== "all" ? statusValue : undefined,
      isDefault:
        isDefaultFilter === "true"
          ? true
          : isDefaultFilter === "false"
            ? false
            : undefined,
      country: countryFilter || undefined,
      city: cityFilter || undefined,
    }),
    [debouncedSearch, statusValue, isDefaultFilter, countryFilter, cityFilter],
  );

  const { data, isLoading, isError, refetch } = useWarehouses(filters);
  const createMutation = useCreateWarehouse();

  const warehouses = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const hasActiveFilters =
    !!localSearch.trim() ||
    statusValue !== "all" ||
    !!isDefaultFilter ||
    !!countryFilter ||
    !!cityFilter;

  const form = useForm<CreateWarehouseValues>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      isActive: true,
    },
  });

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setParam("q", localSearch || undefined);
      }
    },
    [localSearch, setParam],
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? undefined;
    const next = debouncedSearch || undefined;
    if (next !== current) setParam("q", next);
  }, [debouncedSearch, setParam]);

  const handleStatusChange = useCallback(
    (value: string) => setParam("status", value),
    [setParam],
  );

  const handleIsDefaultChange = useCallback(
    (value: string) =>
      setParam("isDefault", value === "all" ? undefined : value),
    [setParam],
  );

  const clearFilters = useCallback(() => {
    setLocalSearch("");
    router.replace("?", { scroll: false });
  }, [router]);

  const handleOpenSheet = useCallback(() => {
    form.reset();
    setSheetOpen(true);
  }, [form]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setSheetOpen(false);
        form.reset();
      }
    },
    [form],
  );

  function handleRetry() {
    void refetch();
  }

  const onSubmit = useCallback(
    (values: CreateWarehouseValues) => {
      const code = values.code.toUpperCase();
      createMutation.mutate(
        {
          name: values.name,
          code,
          address: values.address || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          country: values.country || undefined,
          isActive: values.isActive,
        },
        {
          onSuccess: () => {
            toast.success("Warehouse created");
            setSheetOpen(false);
            form.reset();
          },
          onError: (err: unknown) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, form],
  );

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <SearchInput
        className="min-w-0 flex-1 lg:max-w-md"
        placeholder="Search by name, code, city, country…"
        value={localSearch}
        onValueChange={handleSearchChange}
        onClear={() => {
          setLocalSearch("");
          setParam("q", undefined);
        }}
        onKeyDown={handleSearchKeyDown}
        aria-label="Search warehouses"
      />
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusValue} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[140px] text-xs")}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setShowFilters((prev) => !prev)}
          aria-expanded={showFilters}
        >
          <Filter className="h-3 w-3" aria-hidden="true" />
          Filters
        </Button>
      </div>
      {hasActiveFilters && (
        <AnimatedIconButton icon={XIcon} iconSize={12} iconClassName="mr-0.5" variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={clearFilters}>
          Clear
        </AnimatedIconButton>
      )}
    </div>
  );

  if (isLoading) return <WarehousesLoading />;

  if (isError) {
    return (
      <PageWrapper
        title="Warehouses"
        filters={filterBar}
      >
        <ErrorState
          title="Failed to load warehouses"
          description="An error occurred while fetching warehouse data. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Warehouses"
      subtitle="Physical storage facilities and their locations"
      filters={filterBar}
      actions={
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" className="text-xs" onClick={handleOpenSheet}>
          New Warehouse
        </AnimatedIconButton>
      }
    >
      {showFilters && (
        <div className="mb-4 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0 rounded-lg border bg-muted/30 p-3">
          <Select
            value={isDefaultFilter ?? "all"}
            onValueChange={handleIsDefaultChange}
          >
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] text-xs")}>
              <SelectValue placeholder="Default status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any default status</SelectItem>
              <SelectItem value="true">Default warehouse</SelectItem>
              <SelectItem value="false">Non-default</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {warehouses.length > 0 ? (
        <motion.div
          className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          variants={shouldReduceMotion ? undefined : staggerContainer}
          initial={shouldReduceMotion ? undefined : "hidden"}
          animate={shouldReduceMotion ? undefined : "visible"}
        >
          {warehouses.map((wh) => (
            <WarehouseCard key={wh.id} warehouse={wh} />
          ))}
        </motion.div>
      ) : hasActiveFilters ? (
        <InventoryEmptyState
          illustration={<EmptySearchIllustration />}
          title="No warehouses found"
          description="No warehouses match your current filters."
          action={{ label: "Clear filters", onClick: clearFilters }}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="No warehouses yet"
          description="Add your first warehouse to start managing stock locations."
          action={{ label: "New Warehouse", onClick: handleOpenSheet }}
          className={CONTENT_FILL_PANEL}
        />
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-md w-full flex flex-col gap-0 p-0"
        >
          <SheetHeader className="shrink-0 px-6 py-4 border-b">
            <SheetTitle>New Warehouse</SheetTitle>
            <SheetDescription>
              Add a new storage facility to your organization.
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col flex-1 min-h-0"
            >
              <SheetBody className="px-6 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Main Warehouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="WH-001"
                          className="font-mono uppercase"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Storage Lane" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="Maharashtra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="India" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <FormLabel className="text-[13px] font-medium">
                            Active
                          </FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Allow stock operations in this warehouse
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </SheetBody>
              <SheetFooter className="shrink-0 px-6 py-4 border-t">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSheetOpenChange(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <LoadingButton
                    type="submit"
                    isPending={createMutation.isPending}
                    loadingText="Creating…"
                  >
                    Create Warehouse
                  </LoadingButton>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
