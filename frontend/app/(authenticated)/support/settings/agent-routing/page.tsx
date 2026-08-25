"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { useAgentSkills, useAgentAvailability } from "@/hooks/api/support/macros";
import { AgentSkillsDialog } from "@/features/support/settings/agent-skills-dialog";
import { VipClientsCard } from "@/features/support/settings/vip-clients-card";

interface AgentSkillsRowProps {
  userId: string;
  label: string;
  skills: string[];
  isAvailable: boolean;
  onEdit: (userId: string, label: string, skills: string[]) => void;
}

function AgentSkillsRow({ userId, label, skills, isAvailable, onEdit }: AgentSkillsRowProps) {
  const handleEdit = useCallback(() => onEdit(userId, label, skills), [userId, label, skills, onEdit]);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={
              isAvailable
                ? "h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                : "h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50"
            }
          />
          <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {skills.length > 0 ? (
            skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-micro">
                {skill}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No skills tagged</span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="w-7 shrink-0" onClick={handleEdit} aria-label={`Edit skills for ${label}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function SupportAgentRoutingPage() {
  const { data: membersResponse, isLoading: membersLoading } = useOrgMembers(1, 200);
  const { data: agentSkills, isLoading: skillsLoading } = useAgentSkills();
  const { data: availability } = useAgentAvailability();
  const members = useMemo(() => membersResponse?.data ?? [], [membersResponse]);

  const [editTarget, setEditTarget] = useState<{ userId: string; label: string; skills: string[] } | null>(null);

  const skillsByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of agentSkills ?? []) {
      const current = map.get(row.userId) ?? [];
      current.push(row.skill);
      map.set(row.userId, current);
    }
    return map;
  }, [agentSkills]);

  const availabilityByUser = useMemo(
    () => new Map((availability ?? []).map((a) => [a.userId, a.isAvailable])),
    [availability],
  );

  const handleEdit = useCallback((userId: string, label: string, skills: string[]) => {
    setEditTarget({ userId, label, skills });
  }, []);

  const handleCloseEdit = useCallback(() => setEditTarget(null), []);

  const isLoading = membersLoading || skillsLoading;

  return (
    <PageWrapper title="Agents & VIP Clients" subtitle="Skills, availability, and priority routing inputs">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Agent Skills & Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <LoadingState variant="list" rows={12} />
            ) : (
              members.map((m) => (
                <AgentSkillsRow
                  key={m.userId}
                  userId={m.userId}
                  label={m.name ?? m.email}
                  skills={skillsByUser.get(m.userId) ?? []}
                  isAvailable={availabilityByUser.get(m.userId) ?? true}
                  onEdit={handleEdit}
                />
              ))
            )}
          </CardContent>
        </Card>

        <VipClientsCard />
      </div>

      {editTarget && (
        <AgentSkillsDialog
          userId={editTarget.userId}
          label={editTarget.label}
          initialSkills={editTarget.skills}
          onClose={handleCloseEdit}
        />
      )}
    </PageWrapper>
  );
}
