import { PenTool, Type, Calendar, Mail, User, Building2, Tag, CheckSquare, CircleDot, ChevronDown, Paperclip, Stamp, Minus, AlignLeft, Lock } from "lucide-react";
import type { SignFieldType } from "@/types/sign";

export interface FieldTypeMeta {
  type: SignFieldType;
  label: string;
  icon: typeof PenTool;
  defaultWidth: number;
  defaultHeight: number;
}

export const FIELD_TYPE_META: FieldTypeMeta[] = [
  { type: "signature", label: "Signature", icon: PenTool, defaultWidth: 160, defaultHeight: 40 },
  { type: "initials", label: "Initials", icon: PenTool, defaultWidth: 70, defaultHeight: 40 },
  { type: "date_signed", label: "Date signed", icon: Calendar, defaultWidth: 100, defaultHeight: 28 },
  { type: "text", label: "Text", icon: Type, defaultWidth: 140, defaultHeight: 28 },
  { type: "multiline", label: "Multi-line text", icon: AlignLeft, defaultWidth: 200, defaultHeight: 60 },
  { type: "email", label: "Email", icon: Mail, defaultWidth: 160, defaultHeight: 28 },
  { type: "name", label: "Name", icon: User, defaultWidth: 140, defaultHeight: 28 },
  { type: "company", label: "Company", icon: Building2, defaultWidth: 140, defaultHeight: 28 },
  { type: "title", label: "Title", icon: Tag, defaultWidth: 120, defaultHeight: 28 },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare, defaultWidth: 24, defaultHeight: 24 },
  { type: "radio", label: "Radio group", icon: CircleDot, defaultWidth: 24, defaultHeight: 24 },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown, defaultWidth: 140, defaultHeight: 28 },
  { type: "attachment", label: "Attachment", icon: Paperclip, defaultWidth: 140, defaultHeight: 28 },
  { type: "stamp", label: "Stamp", icon: Stamp, defaultWidth: 100, defaultHeight: 100 },
  { type: "strikethrough", label: "Strikethrough", icon: Minus, defaultWidth: 140, defaultHeight: 28 },
  { type: "readonly_merge", label: "Readonly text", icon: Lock, defaultWidth: 140, defaultHeight: 28 },
];

export function fieldTypeMeta(type: SignFieldType): FieldTypeMeta {
  return FIELD_TYPE_META.find((f) => f.type === type) ?? FIELD_TYPE_META[0];
}
