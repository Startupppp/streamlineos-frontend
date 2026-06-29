"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";
import {
  Map,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useTerritories,
  useCreateTerritory,
  useUpdateTerritory,
  useDeleteTerritory,
  type Territory,
  type CreateTerritoryInput,
} from "@/hooks/api/crm";
import { cn } from "@/lib/utils";

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

function TagInput({ label, tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !tags.some((t) => t.toLowerCase() === lower)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        onChange(tags.slice(0, -1));
      }
    },
    [inputValue, addTag, tags, onChange],
  );

  const removeTag = useCallback(
    (idx: number) => {
      onChange(tags.filter((_, i) => i !== idx));
    },
    [tags, onChange],
  );

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) addTag(inputValue);
  }, [inputValue, addTag]);

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const idx = Number(e.currentTarget.dataset.idx);
      removeTag(idx);
    },
    [removeTag],
  );

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] px-3 py-2 rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring cursor-text"
        onClick={handleContainerClick}
      >
        {tags.map((tag, idx) => (
          <Badge
            key={idx}
            variant="secondary"
            className="flex items-center gap-1 text-xs h-5 pr-1"
          >
            {tag}
            <button
              type="button"
              data-idx={idx}
              onClick={handleRemoveClick}
              className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Press Enter to add each item
      </p>
    </div>
  );
}

interface FormState {
  name: string;
  states: string[];
  cities: string[];
  description: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return { name: "", states: [], cities: [], description: "", isActive: true };
}

function fromTerritory(t: Territory): FormState {
  return {
    name: t.name,
    states: t.states ?? [],
    cities: t.cities ?? [],
    description: t.description ?? "",
    isActive: t.isActive,
  };
}

interface TerritoryCardProps {
  territory: Territory;
  onEdit: (t: Territory) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function TerritoryCard({
  territory: t,
  onEdit,
  onDelete,
  isDeleting,
}: TerritoryCardProps) {
  const MAX_CITIES = 5;
  const visibleCities = (t.cities ?? []).slice(0, MAX_CITIES);
  const extraCities = (t.cities ?? []).length - MAX_CITIES;

  const handleEdit = useCallback(() => onEdit(t), [onEdit, t]);
  const handleDelete = useCallback(() => onDelete(t.id), [onDelete, t.id]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {t.name}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] shrink-0",
              t.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200",
            )}
          >
            {t.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {(t.states ?? []).length > 0 && (
          <div className="flex items-start gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {(t.states ?? []).join(", ")}
            </p>
          </div>
        )}

        {(t.cities ?? []).length > 0 && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {visibleCities.map((city) => (
                <Badge
                  key={city}
                  variant="outline"
                  className="text-[10px] h-4 px-1.5"
                >
                  {city}
                </Badge>
              ))}
              {extraCities > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 text-muted-foreground"
                >
                  +{extraCities} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {(t.assignedReps ?? []).length} assigned rep
            {(t.assignedReps ?? []).length !== 1 ? "s" : ""}
          </span>
        </div>

        {t.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {t.description}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleEdit}
            aria-label={`Edit ${t.name}`}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={isDeleting}
                aria-label={`Delete ${t.name}`}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Territory</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{t.name}</strong>?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TerritoriesPage() {
  const {
    data: territories = [],
    isLoading,
    isError,
    refetch,
  } = useTerritories();
  const { mutate: createTerritory, isPending: isCreating } =
    useCreateTerritory();
  const { mutate: updateTerritory, isPending: isUpdating } =
    useUpdateTerritory();
  const { mutate: deleteTerritory, variables: deletingVars } =
    useDeleteTerritory();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Territory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(emptyForm());
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((t: Territory) => {
    setEditTarget(t);
    setForm(fromTerritory(t));
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const payload: CreateTerritoryInput = {
      name: form.name.trim(),
      states: form.states,
      cities: form.cities,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
    };

    if (editTarget) {
      updateTerritory(
        { id: editTarget.id, ...payload },
        {
          onSuccess: () => {
            setSheetOpen(false);
            toast.success("Territory updated");
          },
          onError: () => toast.error("Failed to update territory"),
        },
      );
    } else {
      createTerritory(payload, {
        onSuccess: () => {
          setSheetOpen(false);
          toast.success("Territory created");
        },
        onError: () => toast.error("Failed to create territory"),
      });
    }
  }, [form, editTarget, createTerritory, updateTerritory]);

  const handleDelete = useCallback(
    (id: number) => {
      deleteTerritory(id, {
        onSuccess: () => toast.success("Territory deleted"),
        onError: () => toast.error("Failed to delete territory"),
      });
    },
    [deleteTerritory],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, name: e.target.value }));
    },
    [],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, description: e.target.value }));
    },
    [],
  );

  const handleActiveChange = useCallback((v: boolean) => {
    setForm((f) => ({ ...f, isActive: v }));
  }, []);

  const handleStatesChange = useCallback((states: string[]) => {
    setForm((f) => ({ ...f, states }));
  }, []);

  const handleCitiesChange = useCallback((cities: string[]) => {
    setForm((f) => ({ ...f, cities }));
  }, []);

  const handleSheetClose = useCallback(() => setSheetOpen(false), []);

  const totalTerritories = territories.length;
  const activeTerritories = territories.filter((t) => t.isActive).length;
  const totalCities = territories.reduce(
    (sum, t) => sum + (t.cities ?? []).length,
    0,
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Territory Management"
        subtitle="Define geographic territories and assign sales reps"
      >
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Territory Management"
        subtitle="Define geographic territories and assign sales reps"
      >
        <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/60" />
          <div>
            <p className="font-medium text-foreground">
              Failed to load territories
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Something went wrong. Please try again.
            </p>
          </div>
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Territory Management"
      subtitle="Define geographic territories and assign sales reps"
      actions={
        <Button size="sm" onClick={openCreate} aria-label="Create territory">
          <Plus className="h-4 w-4 mr-2" />
          Add Territory
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatCard
            label="Total Territories"
            value={totalTerritories}
            color="blue"
            icon={Map}
          />
          <StatCard
            label="Active Territories"
            value={activeTerritories}
            color="green"
            icon={CheckCircle2}
          />
          <StatCard
            label="Cities Covered"
            value={totalCities}
            color="amber"
            icon={MapPin}
          />
        </div>

        {territories.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-4 text-center">
            <Map className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-foreground">No territories yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first territory to start assigning sales reps to
                geographic regions.
              </p>
            </div>
            <Button onClick={openCreate} aria-label="Create first territory">
              <Plus className="h-4 w-4 mr-2" />
              Add Territory
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {territories.map((t) => (
              <TerritoryCard
                key={t.id}
                territory={t}
                onEdit={openEdit}
                onDelete={handleDelete}
                isDeleting={deletingVars === t.id}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editTarget ? "Edit Territory" : "Create Territory"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="territory-name">Name *</Label>
              <Input
                id="territory-name"
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Mumbai North"
              />
            </div>

            <TagInput
              label="States"
              tags={form.states}
              onChange={handleStatesChange}
              placeholder="Type a state and press Enter…"
            />

            <TagInput
              label="Cities"
              tags={form.cities}
              onChange={handleCitiesChange}
              placeholder="Type a city and press Enter…"
            />

            <div className="space-y-1.5">
              <Label htmlFor="territory-description">Description</Label>
              <Textarea
                id="territory-description"
                value={form.description}
                onChange={handleDescriptionChange}
                placeholder="Optional notes about this territory…"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="territory-active">Active</Label>
              <Switch
                id="territory-active"
                checked={form.isActive}
                onCheckedChange={handleActiveChange}
              />
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSheetClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!form.name.trim() || isCreating || isUpdating}
              onClick={handleSubmit}
            >
              {isCreating || isUpdating
                ? "Saving…"
                : editTarget
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
