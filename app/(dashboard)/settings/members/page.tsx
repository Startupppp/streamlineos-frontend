"use client";

import {
  useOrgMembers,
  useInvitations,
  useInviteUser,
  useCancelInvitation,
  useUpdateMemberRole,
} from "@/lib/api/hooks/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Search, UserPlus, Shield } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";

const ALL_ROLES = [
  { value: "CEO", label: "CEO" },
  { value: "HR", label: "HR" },
  { value: "SALES", label: "Sales" },
  { value: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { value: "ENGINEERING", label: "Engineering" },
  { value: "DESIGN", label: "Design" },
  { value: "VIDEO_EDITOR", label: "Video Editor" },
  { value: "DIGITAL_MARKETING", label: "Digital Marketing" },
];

const ROLE_COLORS: Record<string, string> = {
  CEO: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  HR: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  SALES: "bg-green-500/15 text-green-400 border-green-500/20",
  CUSTOMER_SUPPORT: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ENGINEERING: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  DESIGN: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  VIDEO_EDITOR: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  DIGITAL_MARKETING: "bg-teal-500/15 text-teal-400 border-teal-500/20",
};

export default function MembersSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("ENGINEERING");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const memberSearch = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const debouncedSearch = useDebouncedValue(memberSearch, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data: membersData, isLoading: membersLoading } = useOrgMembers(
    page,
    20,
    debouncedSearch || undefined
  );
  const { data: invitations } = useInvitations();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const updateRole = useUpdateMemberRole();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteUser.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: () => {
          toast.success("Invitation sent!");
          setInviteEmail("");
          setShowInviteForm(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to send invitation");
        },
      }
    );
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitation.mutate(
      { invitationId },
      { onError: (err) => toast.error(err.message) }
    );
  };

  const handleUpdateRole = (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated successfully"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <PageWrapper
      title="Members"
      subtitle="Manage organization members, roles, and invitations"
      badge={membersData ? String(membersData.pagination.total) : undefined}
      actions={
        <Button onClick={() => setShowInviteForm(!showInviteForm)} className="bg-gold hover:bg-gold/80 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          {showInviteForm ? "Cancel" : "Invite Member"}
        </Button>
      }
    >
      <div className="space-y-6">
      {showInviteForm && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Invite New Member</CardTitle>
            <CardDescription>Send an invitation to join your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div className="w-[180px] space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.filter(r => r.value !== "CEO").map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviteUser.isPending}>
                {inviteUser.isPending ? "Sending..." : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Current Members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                Organization Members
                {membersData && <Badge variant="secondary" className="ml-2 text-xs">{membersData.pagination.total}</Badge>}
              </CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-max">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-semibold px-4">Member</TableHead>
                  <TableHead className="text-xs font-semibold px-4">Email</TableHead>
                  <TableHead className="text-xs font-semibold px-4">Role</TableHead>
                  <TableHead className="text-xs font-semibold px-4">Joined</TableHead>
                  <TableHead className="text-xs font-semibold px-4 text-right">Change Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="px-4 py-3">
                        <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !membersData?.data.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  membersData.data.map((member) => (
                    <TableRow key={member.userId} className="hover:bg-muted/30">
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={resolveImageUrl(member.image)} />
                            <AvatarFallback className="text-xs bg-gold/10 text-gold">
                              {member.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{member.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">{member.email}</TableCell>
                      <TableCell className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-[10px] border ${ROLE_COLORS[member.role] || ""}`}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-xs text-muted-foreground">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("en-IN") : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right">
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleUpdateRole(member.userId, newRole, member.role)}
                        >
                          <SelectTrigger className="h-7 w-[150px] text-xs ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map(r => (
                              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          {membersData && membersData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t">
              <span className="text-xs text-muted-foreground">
                Page {membersData.pagination.page} of {membersData.pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  disabled={page <= 1} onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>Prev</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  disabled={page >= membersData.pagination.totalPages} onClick={() => updateParams({ page: String(page + 1) })}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations && invitations.length > 0 ? (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${ROLE_COLORS[inv.role] || ""}`}>{inv.role}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => handleCancelInvitation(inv.id)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <EmptyMailIllustration />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageWrapper>
  );
}
