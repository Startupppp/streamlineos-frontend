import type { LucideIcon } from "lucide-react";

export type AiCategory = "sales" | "hr" | "marketing" | "general";

export type AiAccent =
  | "amber"
  | "blue"
  | "emerald"
  | "violet"
  | "red"
  | "indigo"
  | "teal"
  | "pink"
  | "cyan"
  | "orange"
  | "sky";

export interface AiFeature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: AiCategory;
  accent: AiAccent;
}

export interface AiInputConfig {
  label: string;
  placeholder: string;
  type: "text" | "number" | "textarea" | "none";
  hasSecond?: boolean;
  secondLabel?: string;
  secondPlaceholder?: string;
}
