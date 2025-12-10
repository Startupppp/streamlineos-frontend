"use client";

import { useGetOrganizations, useGetInvitations, useInviteUser, useCancelInvitation, useUpdateMemberRole, useRemoveMember } from "../../../../lib/hooks/auth-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Badge } from "../../../../components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";

export default function MembersSettingsPage() {
  const { data: organizations } = useGetOrganizations();
  const orgId = organizations?.[0]?.id;
  const { data: invitations } = useGetInvitations(orgId || "");
  const inviteUser = useInviteUser();
  const cancelInvitation = useCancelInvitation();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN" | "CLIENT">("MEMBER");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("No organization selected");
      return;
    }

    try {
      await inviteUser.mutateAsync({
        email: inviteEmail,
        orgId,
        role: inviteRole,
      });
      toast.success("Invitation sent!");
      setInviteEmail("");
      setShowInviteForm(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(message);
    }
  };

  if (!orgId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Please select an organization first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">Manage organization members and invitations</p>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          {showInviteForm ? "Cancel" : "Invite Member"}
        </Button>
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite New Member</CardTitle>
            <CardDescription>Send an invitation to join your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviteUser.isPending}>
                {inviteUser.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations that haven't been accepted yet</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations && invitations.length > 0 ? (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{inv.email}</p>
                    <p className="text-sm text-muted-foreground">Role: {inv.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (orgId) {
                        cancelInvitation.mutate({ invitationId: inv.id, orgId });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending invitations</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
