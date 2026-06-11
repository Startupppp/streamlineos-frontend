"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { Plus, TrendingUp, ArrowUpRight, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";

interface CareerLadder {
  id: number; title: string; department: string | null; description: string | null;
  levels: { title: string; requirements: string }[] | null;
  createdAt: string | null;
}

const clKeys = { all: [...queryKeys.hr.all, "career-ladders"] as const, list: () => [...clKeys.all, "list"] as const };

export default function CareerLaddersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:employees");

  const { data: ladders, isLoading } = useQuery({
    queryKey: clKeys.list(),
    queryFn: () => apiClient.get<CareerLadder[]>("/hr/career-ladders"),
  });

  const create = useMutation({
    mutationFn: (data: { title: string; department?: string; description?: string }) =>
      apiClient.post<CareerLadder>("/hr/career-ladders", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: clKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = useCallback(() => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    create.mutate(
      { title: title.trim(), department: department || undefined, description: description || undefined },
      {
        onSuccess: () => {
          toast.success("Career ladder created"); setSheetOpen(false);
          setTitle(""); setDepartment(""); setDescription("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, department, description, create]);

  if (isLoading) {
    return (
      <PageWrapper title="Career Ladders" subtitle="Growth paths and career progression">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Career Ladders"
      subtitle="Define career progression paths for your organization"
      badge={`${ladders?.length ?? 0} paths`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Create Ladder</Button> : undefined}
    >
      {!ladders?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyTeamIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No career ladders defined yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ladders.map((cl: CareerLadder) => (
            <Card key={cl.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {cl.department && <Badge variant="outline" className="text-[10px]">{cl.department}</Badge>}
                </div>
                <h3 className="text-sm font-semibold leading-tight">{cl.title}</h3>
                {cl.description && <p className="text-xs text-muted-foreground line-clamp-2">{cl.description}</p>}
                {cl.levels && cl.levels.length > 0 && (
                  <div className="space-y-1">
                    {cl.levels.slice(0, 4).map((lvl, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ArrowUpRight className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{lvl.title}</span>
                      </div>
                    ))}
                    {cl.levels.length > 4 && <p className="text-[10px] text-muted-foreground pl-4">+{cl.levels.length - 4} more levels</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create Career Ladder" onSubmit={handleCreate} submitLabel="Create" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input placeholder="e.g., Engineering Career Path" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Department</label>
          <Input placeholder="e.g., Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea placeholder="Describe the career path..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
