"use client";

import { useState, useCallback } from "react";
import { useHrDepartments, useCreateDepartment } from "@/hooks/api/hr/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Building2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  canManage: boolean;
}

export function DepartmentsTab({ canManage }: Props) {
  const { data: departments, isLoading } = useHrDepartments();
  const createMutation = useCreateDepartment();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSearch = useCallback(
    (value: string) => setSearch(value),
    [],
  );
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );
  const handleCreate = useCallback(() => {
    setName("");
    setCreateOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createMutation.mutate(
        { name: name.trim() },
        {
          onSuccess: () => {
            toast.success("Department created");
            setCreateOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [name, createMutation],
  );

  const filtered = (departments ?? []).filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="min-w-0 flex-1 max-w-xs">
          <SearchInput value={search} onValueChange={handleSearch} placeholder="Search departments..." />
        </div>
        {canManage && (
          <AnimatedIconButton size="sm" className="gap-1.5" onClick={handleCreate} icon={PlusIcon} iconSize={14} iconClassName="mr-1.5">
            Add Department
          </AnimatedIconButton>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            No departments found
          </p>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 gap-1.5"
              onClick={handleCreate}
            >
              <PlusIcon size={14} />
              Add first department
            </Button>
          )}
        </div>
      ) : (
        <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-medium flex-1 truncate">
                    {dept.name}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">New Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={handleNameChange}
                placeholder="Department name"
                className="text-sm"
                autoFocus
              />
            </div>
            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                isPending={createMutation.isPending}
              >
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
