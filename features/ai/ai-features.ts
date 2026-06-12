import {
  Sparkles,
  Brain,
  Mail,
  TrendingUp,
  Target,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  Zap,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import type { AiFeature, AiCategory, AiInputConfig } from "./types";

export const AI_FEATURES: AiFeature[] = [
  {
    id: "score-lead",
    title: "Lead Scoring",
    description:
      "AI scores leads 0–100 based on engagement, fit, and conversion signals.",
    icon: Target,
    category: "sales",
    accent: "amber",
  },
  {
    id: "generate-email",
    title: "Email Generator",
    description: "Generate follow-up emails in formal, friendly, or urgent tones.",
    icon: Mail,
    category: "sales",
    accent: "blue",
  },
  {
    id: "predict-deal",
    title: "Deal Prediction",
    description: "Predict deal win probability based on pipeline metrics.",
    icon: TrendingUp,
    category: "sales",
    accent: "emerald",
  },
  {
    id: "next-action",
    title: "Next Best Action",
    description: "AI suggests the optimal next step for any lead.",
    icon: Zap,
    category: "sales",
    accent: "violet",
  },
  {
    id: "objection-handler",
    title: "Objection Handler",
    description:
      "Get counter-arguments and talking points for sales objections.",
    icon: MessageSquare,
    category: "sales",
    accent: "red",
  },
  {
    id: "subject-lines",
    title: "Subject Lines",
    description: "Generate high-converting email subject line variations.",
    icon: Mail,
    category: "marketing",
    accent: "indigo",
  },
  {
    id: "content-brief",
    title: "Content Brief",
    description: "Create content outlines with keywords, CTA, and word count.",
    icon: FileText,
    category: "marketing",
    accent: "teal",
  },
  {
    id: "sentiment",
    title: "Sentiment Analysis",
    description: "Analyze client communication for churn risk signals.",
    icon: Brain,
    category: "sales",
    accent: "pink",
  },
  {
    id: "score-candidate",
    title: "Candidate Scoring",
    description: "Score job candidates against role requirements.",
    icon: Users,
    category: "hr",
    accent: "cyan",
  },
  {
    id: "generate-review",
    title: "Review Generator",
    description:
      "Draft employee performance reviews with category ratings.",
    icon: ClipboardList,
    category: "hr",
    accent: "orange",
  },
  {
    id: "helpdesk-reply",
    title: "Helpdesk Reply",
    description: "AI-suggested replies for employee helpdesk tickets.",
    icon: MessageSquare,
    category: "hr",
    accent: "emerald",
  },
  {
    id: "attrition-risk",
    title: "Attrition Risk",
    description: "Predict employee attrition risk based on behavior signals.",
    icon: AlertTriangle,
    category: "hr",
    accent: "red",
  },
  {
    id: "generate-jd",
    title: "JD Generator",
    description: "Generate complete job descriptions from role title.",
    icon: FileText,
    category: "hr",
    accent: "violet",
  },
  {
    id: "meeting-prep",
    title: "Meeting Prep",
    description: "Generate pre-meeting briefs with context and talking points.",
    icon: ShieldCheck,
    category: "sales",
    accent: "sky",
  },
];

export const AI_CATEGORIES: { value: AiCategory | "all"; label: string }[] = [
  { value: "all", label: "All Features" },
  { value: "sales", label: "Sales & CRM" },
  { value: "hr", label: "HR & People" },
  { value: "marketing", label: "Marketing" },
  { value: "general", label: "General" },
];

export function getAiInputConfig(featureId: string): AiInputConfig {
  switch (featureId) {
    case "score-lead":
      return { label: "Lead ID", placeholder: "Enter lead ID", type: "number" };
    case "generate-email":
      return {
        label: "Lead Name",
        placeholder: "Enter lead or prospect name",
        type: "text",
      };
    case "predict-deal":
      return { label: "Deal ID", placeholder: "Enter deal ID", type: "number" };
    case "next-action":
      return { label: "Lead ID", placeholder: "Enter lead ID", type: "number" };
    case "objection-handler":
      return {
        label: "Objection",
        placeholder: "What objection did the prospect raise?",
        type: "text",
        hasSecond: true,
        secondLabel: "Deal Stage",
        secondPlaceholder: "e.g., PROPOSAL, NEGOTIATION",
      };
    case "subject-lines":
      return {
        label: "Topic",
        placeholder: "Campaign topic or product name",
        type: "text",
      };
    case "content-brief":
      return { label: "Topic", placeholder: "Content topic", type: "text" };
    case "sentiment":
      return {
        label: "Text to Analyze",
        placeholder: "Paste client message or email",
        type: "textarea",
      };
    case "score-candidate":
      return {
        label: "Candidate ID",
        placeholder: "Enter candidate ID",
        type: "number",
      };
    case "generate-review":
      return {
        label: "Employee User ID",
        placeholder: "Enter user ID",
        type: "text",
      };
    case "helpdesk-reply":
      return {
        label: "Ticket ID",
        placeholder: "Enter helpdesk ticket ID",
        type: "number",
      };
    case "attrition-risk":
      return {
        label: "Employee User ID",
        placeholder: "Enter user ID",
        type: "text",
      };
    case "generate-jd":
      return {
        label: "Job Title",
        placeholder: "e.g., Senior Frontend Engineer",
        type: "text",
        hasSecond: true,
        secondLabel: "Location",
        secondPlaceholder: "e.g., Mumbai, Remote",
      };
    case "meeting-prep":
      return {
        label: "Meeting Title",
        placeholder: "e.g., Quarterly review with client",
        type: "text",
        hasSecond: true,
        secondLabel: "Attendee ID (Lead)",
        secondPlaceholder: "Lead ID number",
      };
    default:
      return { label: "Input", placeholder: "Enter input", type: "text" };
  }
}
