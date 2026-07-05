import {
  Type,
  AlignLeft,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Star,
  Gauge,
  Hash,
  Mail,
  Phone,
  Calendar,
  Grid3x3,
  ListOrdered,
  ArrowUpDown,
  SlidersHorizontal,
  ToggleLeft,
  ShieldCheck,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type SurveyQuestionType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "dropdown"
  | "rating"
  | "star_rating"
  | "nps"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "matrix"
  | "likert"
  | "ranking"
  | "slider"
  | "yes_no"
  | "consent"
  | "content_block";

interface QuestionTypeMeta {
  label: string;
  icon: LucideIcon;
  hasChoices: boolean;
  isContentOnly: boolean;
}

export const QUESTION_TYPE_META: Record<SurveyQuestionType, QuestionTypeMeta> = {
  short_text: { label: "Short text", icon: Type, hasChoices: false, isContentOnly: false },
  long_text: { label: "Long text", icon: AlignLeft, hasChoices: false, isContentOnly: false },
  single_select: { label: "Single select", icon: CircleDot, hasChoices: true, isContentOnly: false },
  multi_select: { label: "Multi select", icon: CheckSquare, hasChoices: true, isContentOnly: false },
  dropdown: { label: "Dropdown", icon: ChevronDown, hasChoices: true, isContentOnly: false },
  rating: { label: "Rating", icon: Gauge, hasChoices: false, isContentOnly: false },
  star_rating: { label: "Star rating", icon: Star, hasChoices: false, isContentOnly: false },
  nps: { label: "NPS", icon: Gauge, hasChoices: false, isContentOnly: false },
  number: { label: "Number", icon: Hash, hasChoices: false, isContentOnly: false },
  email: { label: "Email", icon: Mail, hasChoices: false, isContentOnly: false },
  phone: { label: "Phone", icon: Phone, hasChoices: false, isContentOnly: false },
  date: { label: "Date", icon: Calendar, hasChoices: false, isContentOnly: false },
  matrix: { label: "Matrix", icon: Grid3x3, hasChoices: true, isContentOnly: false },
  likert: { label: "Likert scale", icon: ListOrdered, hasChoices: true, isContentOnly: false },
  ranking: { label: "Ranking", icon: ArrowUpDown, hasChoices: true, isContentOnly: false },
  slider: { label: "Slider", icon: SlidersHorizontal, hasChoices: false, isContentOnly: false },
  yes_no: { label: "Yes / No", icon: ToggleLeft, hasChoices: false, isContentOnly: false },
  consent: { label: "Consent checkbox", icon: ShieldCheck, hasChoices: false, isContentOnly: false },
  content_block: { label: "Content block", icon: FileText, hasChoices: false, isContentOnly: true },
};

export const QUESTION_TYPE_LIST = Object.keys(QUESTION_TYPE_META) as SurveyQuestionType[];
