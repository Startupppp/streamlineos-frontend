"use client";

import {
  useOrgMembers,
  useInvitations,
  useInviteUser,
  useCancelInvitation,
  useUpdateMemberRole,
} from "@/lib/api/hooks/organization";
import { useResetMfa, useResendInvitation } from "@/lib/api/hooks/mfa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyMailIllustration } from "@/components/illustrations";
import { Search, UserPlus, Shield } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberTableRow } from "@/features/settings/members/member-table-row";
import { InvitationRow } from "@/features/settings/members/invitation-row";
import { ALL_ROLES } from "@/features/settings/members/role-constants";

export default function MembersSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("ENGINEERING");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const memberSearch = searchParams.get("q") || "";
  const page = Number(searchParams.get("page")) || 1;
  const debouncedSearch = useDebouncedValue(memberSearch, 300);

  const currentUserRole = session?.user?.role;
  const canManageMfa = currentUserRole === "CEO" || currentUserRole === "HR";

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
    debouncedSearch || undefined,
  );
  const { data: invitations } = useInvitations();
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const updateRole = useUpdateMemberRole();
  const resetMfa = useResetMfa();
  const resendInvitation = useResendInvitation();

  const handleInvite = useCallback(
    (e: React.FormEvent) => {
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
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [inviteUser, inviteEmail, inviteRole],
  );

  const handleCancelInvitation = useCallback(
    (invitationId: string) => {
      cancelInvitation.mutate(
        { invitationId },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [cancelInvitation],
  );

  const handleResendInvitation = useCallback(
    (invitationId: string) => {
      resendInvitation.mutate(
        { invitationId },
        {
          onSuccess: () => toast.success("Invitation resent"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [resendInvitation],
  );

  const handleUpdateRole = useCallback(
    (userId: string, newRole: string, currentRole: string) => {
      if (newRole === currentRole) return;
      updateRole.mutate(
        { userId, role: newRole },
        {
          onSuccess: () => toast.success("Role updated successfully"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateRole],
  );

  const handleResetMfa = useCallback(
    (userId: string) => {
      resetMfa.mutate(
        { userId },
        {
          onSuccess: () => toast.success("MFA reset successfully"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [resetMfa],
  );

  const handleToggleInviteForm = useCallback(() => setShowInviteForm((v) => !v), []);
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInviteEmail(e.target.value),
    [],
  );
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParams({ q: e.target.value || null, page: null });
    },
    [updateParams],
  );
  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [page, updateParams],
  );
  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [page, updateParams],
  );

  return (
    <PageWrapper
      title="Members"
      subtitle="Manage organization members, roles, and invitations"
      badge={membersData ? String(membersData.pagination.total) : undefined}
      actions={
        <Button onClick={handleToggleInviteForm}>
          <UserPlus className="h-4 w-4 mr-2" />
          {showInviteForm ? "Cancel" : "Invite Member"}
        </Button>
      }
    >
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList className="h-auto w-full sm:w-fit gap-1 rounded-lg p-1">
          <TabsTrigger value="members">
            Members
            {membersData && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {membersData.pagination.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {invitations && invitations.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {invitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {showInviteForm && (
            <Card className="rounded-xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Invite New Member</CardTitle>
                <CardDescription>Send an invitation to join your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={handleEmailChange}
                      required
                    />
                  </div>
                  <div className="w-full sm:w-[180px] space-y-1.5">
                    <Label className="text-sm">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.filter((r) => r.value !== "CEO").map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={inviteUser.isPending} className="w-full sm:w-auto">
                    {inviteUser.isPending ? "Sending..." : "Send"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-xl border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Organization Members
                    {membersData && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {membersData.pagination.total}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={handleSearchChange}
                    className="h-9 pl-8 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[65vh]" type="auto">
                <div className="min-w-[900px]">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="px-5 py-3 text-xs font-semibold">Member</TableHead>
                        <TableHead className="px-5 py-3 text-xs font-semibold">Email</TableHead>
                        <TableHead className="px-5 py-3 text-xs font-semibold">Role</TableHead>
                        <TableHead className="px-5 py-3 text-xs font-semibold">Joined</TableHead>
                        <TableHead className="px-5 py-3 text-right text-xs font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={5} className="px-5 py-4">
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
                          <MemberTableRow
                            key={member.userId}
                            member={member}
                            onUpdateRole={handleUpdateRole}
                            onResetMfa={handleResetMfa}
                            canManageMfa={canManageMfa}
                            isResettingMfa={resetMfa.isPending}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
              {membersData && membersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-5 py-3">
                  <span className="text-sm text-muted-foreground">
                    Page {membersData.pagination.page} of {membersData.pagination.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={page <= 1}
                      onClick={handlePrevPage}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={page >= membersData.pagination.totalPages}
                      onClick={handleNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Invite New Member</CardTitle>
              <CardDescription>Send an invitation to join your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="inv-tab-email" className="text-sm">Email</Label>
                  <Input
                    id="inv-tab-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={handleEmailChange}
                    required
                  />
                </div>
                <div className="w-full sm:w-[180px] space-y-1.5">
                  <Label className="text-sm">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.filter((r) => r.value !== "CEO").map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviteUser.isPending} className="w-full sm:w-auto">
                  {inviteUser.isPending ? "Sending..." : "Send Invite"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Pending Invitations
                {invitations && invitations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {invitations.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitations && invitations.length > 0 ? (
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <InvitationRow
                      key={inv.id}
                      inv={inv}
                      onCancel={handleCancelInvitation}
                      onResend={handleResendInvitation}
                      isResending={resendInvitation.isPending}
                    />
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
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
