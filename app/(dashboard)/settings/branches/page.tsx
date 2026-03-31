"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Building2, MapPin, Users, Edit2,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BranchManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", city: "", address: "" });

  const { data: branchList, isLoading, refetch } = api.branches.getAll.useQuery();

  const createMutation = api.branches.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Branch created"); setShowCreate(false); setFormData({ name: "", code: "", city: "", address: "" }); },
    onError: (err) => toast.error(err.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const branches = (branchList || []) as any[];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader title="Branch Management" description="Manage organization branches and assign branch leaders" />
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Add Branch</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium text-foreground">No branches yet</p>
            <p className="text-xs mt-1">Create a branch to set up your multi-branch hierarchy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:border-[#bd882c]/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{branch.code}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]",
                    branch.status === "ACTIVE" ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"
                  )}>
                    {branch.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {branch.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {branch.city}
                  </p>
                )}
                {branch.address && (
                  <p className="text-xs text-muted-foreground">{branch.address}</p>
                )}

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch Manager</span>
                    {branch.branchManager ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={branch.branchManager.image || ""} />
                          <AvatarFallback className="text-[8px]">{branch.branchManager.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchManager.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch HR</span>
                    {branch.branchHr ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={branch.branchHr.image || ""} />
                          <AvatarFallback className="text-[8px]">{branch.branchHr.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{branch.branchHr.name}</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Not assigned</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Branch</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Branch Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Mumbai Office" />
              </div>
              <div className="space-y-1.5">
                <Label>Branch Code *</Label>
                <Input value={formData.code} onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))} placeholder="e.g., MUM-01" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!formData.name || !formData.code} onClick={() => createMutation.mutate(formData)}>Create Branch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
