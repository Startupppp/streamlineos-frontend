import { type DataTableColumn } from "@/components/ui/data-table";
import type { SupportTeamMember } from "@/types/crm/contacts";
import { cn } from "@/lib/utils";
import { getColorSafe, onlineStatusColors } from "@/lib/theme-constants";

export const formatTicketValue = (v: number) => v.toLocaleString();

export const TEAM_COLUMNS: DataTableColumn<SupportTeamMember>[] = [
  {
    key: "name",
    header: "Name",
    cell: (member) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-primary">{member.avatar}</span>
        </div>
        <span className="font-medium text-foreground">{member.name}</span>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role",
    className: "text-muted-foreground",
    cell: (member) => member.role,
  },
  {
    key: "access",
    header: "Access",
    cell: (member) => (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        {member.access}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (member) => <TeamMemberStatus member={member} />,
  },
];

function TeamMemberStatus({ member }: { member: SupportTeamMember }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", getColorSafe(onlineStatusColors, member.status))} />
      <span className="text-xs capitalize text-muted-foreground">{member.status}</span>
    </div>
  );
}

export function getTeamMemberKey(member: SupportTeamMember) {
  return member.name;
}
