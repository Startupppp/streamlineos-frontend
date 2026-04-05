"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Plus, MapPin, Phone, Mail } from "lucide-react";
import { useBranches, useCreateBranch } from "@/lib/api/hooks/branches";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "", code: "", city: "", state: "", country: "India",
  pincode: "", address: "", phone: "", email: "",
};

export default function BranchManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const { data: branchList, isLoading } = useBranches();
  const createMutation = useCreateBranch();

  const branches = branchList ?? [];

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData(f => ({ ...f, [key]: e.target.value }));

  const handleOpenCreate = useCallback(() => setShowCreate(true), []);
  const handleCloseCreate = useCallback(() => setShowCreate(false), []);

  const handleCreate = () => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Branch created");
        setShowCreate(false);
        setFormData({ ...EMPTY_FORM });
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <PageWrapper
      title="Branch Management"
      subtitle="Manage your organization's branch offices"
      badge={branches.length > 0 ? String(branches.length) : undefined}
      actions={
        <Button onClick={handleOpenCreate} className="bg-gold hover:bg-gold/80 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      }
    >
      <div className="space-y-6">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <EmptyTeamIllustration className="mx-auto mb-4 w-40 h-40" />
            <p className="text-sm font-medium text-foreground">No branches yet</p>
            <p className="text-xs mt-1">Create a branch to set up your multi-branch hierarchy.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:border-gold/30 transition-colors">
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
                {(branch.city || branch.state) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {[branch.city, branch.state, branch.country].filter(Boolean).join(", ")}
                    {branch.pincode && <span className="font-mono">— {branch.pincode}</span>}
                  </p>
                )}
                {branch.address && (
                  <p className="text-xs text-muted-foreground">{branch.address}</p>
                )}
                {branch.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {branch.phone}
                  </p>
                )}
                {branch.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" /> {branch.email}
                  </p>
                )}

                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Branch Manager</span>
                    {branch.branchManager ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
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
      </div>

      {/* Create Branch Sheet */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Branch</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            <div className="space-y-4 py-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Branch Name *</Label>
                  <Input value={formData.name} onChange={set("name")} placeholder="e.g., Mumbai Office" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Branch Code *</Label>
                  <Input value={formData.code} onChange={set("code")} placeholder="e.g., MUM-01" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input value={formData.city} onChange={set("city")} placeholder="e.g., Mumbai" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input value={formData.state} onChange={set("state")} placeholder="e.g., Maharashtra" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Country</Label>
                  <Input value={formData.country} onChange={set("country")} placeholder="e.g., India" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pincode</Label>
                  <Input value={formData.pincode} onChange={set("pincode")} placeholder="e.g., 400001" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input value={formData.address} onChange={set("address")} placeholder="Full street address" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={formData.phone} onChange={set("phone")} placeholder="e.g., +91 9876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input value={formData.email} onChange={set("email")} placeholder="branch@company.com" />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={handleCloseCreate}>Cancel</Button>
                <Button
                  className="flex-1"
                  disabled={!formData.name || !formData.code || createMutation.isPending}
                  onClick={handleCreate}
                >
                  Create Branch
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
