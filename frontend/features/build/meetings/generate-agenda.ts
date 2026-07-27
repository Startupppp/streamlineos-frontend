import type { Ticket } from "@/types/projects";
import type { Sprint } from "@/types/projects";

export type AgendaSource = "sprint" | "overdue" | "blocked" | "recently_completed" | "open_action_items";

export interface GenerateAgendaOptions {
  sprint?: Sprint | null;
  tickets?: Ticket[];
  sources: AgendaSource[];
}

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortByPriority(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority ?? "MEDIUM"] ?? 2;
    const pb = PRIORITY_ORDER[b.priority ?? "MEDIUM"] ?? 2;
    return pa - pb;
  });
}

export function generateAgenda(options: GenerateAgendaOptions): string {
  const { sprint, tickets = [], sources } = options;
  const now = new Date();
  const sections: string[] = [];

  if (sources.includes("sprint") && sprint) {
    const sprintTickets = sortByPriority(
      tickets.filter(
        (t) =>
          t.sprintId === sprint.id &&
          t.status !== "DONE" &&
          t.status !== "CANCELLED",
      ),
    ).slice(0, 8);

    if (sprintTickets.length > 0) {
      const lines = sprintTickets.map(
        (t) => `  - [${t.priority ?? "MEDIUM"}] ${t.title} (${t.status})`,
      );
      sections.push(`Sprint: ${sprint.name}\n${lines.join("\n")}`);
    } else if (sprint) {
      sections.push(`Sprint: ${sprint.name}\n  - No open tickets in this sprint`);
    }
  }

  if (sources.includes("overdue")) {
    const overdue = sortByPriority(
      tickets.filter((t) => {
        if (!t.dueDate) return false;
        if (t.status === "DONE" || t.status === "CANCELLED") return false;
        return new Date(t.dueDate) < now;
      }),
    ).slice(0, 6);

    if (overdue.length > 0) {
      const lines = overdue.map(
        (t) => `  - ${t.title} (due ${String(t.dueDate).slice(0, 10)})`,
      );
      sections.push(`Overdue Tickets\n${lines.join("\n")}`);
    }
  }

  if (sources.includes("blocked")) {
    const blocked = sortByPriority(
      tickets.filter((t) => t.status === "BLOCKED"),
    ).slice(0, 6);

    if (blocked.length > 0) {
      const lines = blocked.map((t) => `  - ${t.title}`);
      sections.push(`Blocked Tickets\n${lines.join("\n")}`);
    }
  }

  if (sources.includes("recently_completed")) {
    const completed = tickets
      .filter((t) => t.status === "DONE")
      .sort((a, b) => {
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    if (completed.length > 0) {
      const lines = completed.map((t) => `  - ${t.title}`);
      sections.push(`Recently Completed\n${lines.join("\n")}`);
    }
  }

  if (sources.includes("open_action_items")) {
    sections.push("Open Action Items\n  (Review and update action items from previous meetings)");
  }

  if (sections.length === 0) return "";

  return sections
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n\n");
}
