"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Lead, TeamMember,
  STATUSES, PRIORITIES,
  STATUS_COLORS, PRIORITY_COLORS, SOURCE_COLORS,
  formatINR, timeAgo,
} from "./types";

/* ─── SortIcon ─── */
interface SortIconProps {
  column: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}

export function SortIcon({ column, sortColumn, sortDirection }: SortIconProps) {
  if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
  return sortDirection === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-[#bd882c]" />
    : <ArrowDown className="h-3 w-3 ml-1 text-[#bd882c]" />;
}

/* ─── Cell renderer ─── */
export interface RenderCellOptions {
  lead: Lead;
  colKey: string;
  editingCell: { leadId: number; column: string } | null;
  setEditingCell: (cell: { leadId: number; column: string } | null) => void;
  teamMembers: TeamMember[];
  onStatusChange: (leadId: number, newStatus: string, leadName: string) => void;
  onPriorityChange: (leadId: number, newPriority: string) => void;
  onAssign: (leadId: number, userId: string) => void;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

export function useLeadCellRenderer({
  editingCell,
  setEditingCell,
  teamMembers,
  onStatusChange,
  onPriorityChange,
  onAssign,
}: Omit<RenderCellOptions, "lead" | "colKey">) {
  const router = useRouter();

  return function renderCell(lead: Lead, colKey: string): React.ReactNode {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.column === colKey;

    switch (colKey) {
      case "name":
        return (
          <button
            className="font-medium text-sm hover:text-[#bd882c] hover:underline text-left truncate max-w-[180px]"
            onClick={() => router.push(`/crm/leads/${lead.id}`)}
          >
            {lead.name}
          </button>
        );

      case "email":
        return lead.email ? (
          <button
            onClick={() => copyToClipboard(lead.email!, "Email")}
            className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[160px] block"
          >
            {lead.email}
          </button>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "phone":
        return lead.phone ? (
          <button
            onClick={() => copyToClipboard(lead.phone!, "Phone")}
            className="text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            {lead.phone}
          </button>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "whatsapp":
        return lead.whatsappNumber ? (
          <a
            href={`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${lead.name}, this is from Vaivamm Capital.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            title={`WhatsApp ${lead.whatsappNumber}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="font-mono">{lead.whatsappNumber}</span>
          </a>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "company":
        return <span className="text-xs truncate max-w-[120px] block">{lead.company || "—"}</span>;

      case "source":
        return lead.source ? (
          <Badge
            variant="outline"
            className={cn("text-[10px] border-0", SOURCE_COLORS[lead.source] || SOURCE_COLORS.other)}
          >
            {lead.source.replace("_", " ")}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "status":
        if (isEditing) {
          return (
            <Select
              defaultValue={lead.status}
              onValueChange={(v) => {
                onStatusChange(lead.id, v, lead.name);
                setEditingCell(null);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge
            variant="outline"
            className={cn("text-[10px] cursor-pointer border", STATUS_COLORS[lead.status])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "status" })}
          >
            {lead.status}
          </Badge>
        );

      case "priority":
        if (isEditing) {
          return (
            <Select
              defaultValue={lead.priority || "WARM"}
              onValueChange={(v) => {
                onPriorityChange(lead.id, v);
                setEditingCell(null);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return lead.priority ? (
          <Badge
            variant="outline"
            className={cn("text-[10px] cursor-pointer border", PRIORITY_COLORS[lead.priority])}
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "priority" })}
          >
            {lead.priority}
          </Badge>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "assignedTo":
        if (isEditing) {
          return (
            <Select onValueChange={(v) => { onAssign(lead.id, v); setEditingCell(null); }}>
              <SelectTrigger className="h-7 text-xs w-[140px]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return lead.assignedTo?.name ? (
          <div
            className="flex items-center gap-1.5 cursor-pointer"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={lead.assignedTo.image || ""} />
              <AvatarFallback className="text-[8px]">
                {lead.assignedTo.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate max-w-[90px]">{lead.assignedTo.name}</span>
          </div>
        ) : (
          <span
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onDoubleClick={() => setEditingCell({ leadId: lead.id, column: "assignedTo" })}
          >
            Unassigned
          </span>
        );

      case "score":
        return <span className="text-xs font-mono">{lead.score ?? 0}</span>;

      case "potentialValue":
        return <span className="text-xs font-mono">{formatINR(lead.potentialValue)}</span>;

      case "city":
        return <span className="text-xs">{lead.city || "—"}</span>;

      case "tags":
        return lead.tags?.length ? (
          <div className="flex gap-1 flex-wrap">
            {lead.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[9px] px-1">{t}</Badge>
            ))}
            {lead.tags.length > 2 && (
              <span className="text-[9px] text-muted-foreground">+{lead.tags.length - 2}</span>
            )}
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>;

      case "sla": {
        if (!lead.slaDeadline) return <span className="text-xs text-muted-foreground">—</span>;
        const deadline = new Date(lead.slaDeadline);
        const overdue = deadline < new Date();
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              overdue
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20",
            )}
          >
            {overdue ? "Overdue" : timeAgo(lead.slaDeadline)}
          </Badge>
        );
      }

      case "createdAt":
        return <span className="text-xs text-muted-foreground">{timeAgo(lead.createdAt)}</span>;

      default:
        return null;
    }
  };
}
