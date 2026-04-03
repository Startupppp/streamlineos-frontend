import { Circle, Timer, AlertCircle } from "lucide-react";

export interface TicketDetailsDialogProps {
  ticketId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  statuses?: Array<{ name: string; id: number }>;
}

export interface ProjectMember {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  image: string | null;
  email: string;
}

export const priorityConfig = {
  LOW: {
    label: "Low",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: Circle,
  },
  MEDIUM: {
    label: "Medium",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    icon: Timer,
  },
  HIGH: {
    label: "High",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    icon: AlertCircle,
  },
  URGENT: {
    label: "Urgent",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    icon: AlertCircle,
  },
};

export const statusConfig: Record<string, { label: string; color: string }> = {
  TODO: {
    label: "To Do",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  IN_PROGRESS: {
    label: "In Progress",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  IN_REVIEW: {
    label: "In Review",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  DONE: {
    label: "Done",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
};
