import { ClipboardList, GraduationCap, Radio, Target, Wand2 } from "lucide-react";
import type { SurveyMode } from "@/hooks/api/surveys/forms";

export const SURVEY_MODE_META: Record<SurveyMode, { label: string; icon: typeof ClipboardList; description: string }> = {
  survey: {
    label: "Survey",
    icon: ClipboardList,
    description: "Gather feedback from customers, employees, users, event attendees, or partners.",
  },
  assessment: {
    label: "Assessment",
    icon: GraduationCap,
    description: "Quiz, test, certification, scoring, pass/fail, training checks.",
  },
  live_session: {
    label: "Live Session",
    icon: Radio,
    description: "Host-controlled real-time questions for presentations, classrooms, town halls, and webinars.",
  },
  lead_qualification: {
    label: "Lead Qualification",
    icon: Target,
    description: "Score respondents and create/route leads when key answers are chosen.",
  },
  custom: {
    label: "Custom",
    icon: Wand2,
    description: "Mixed scoring, custom logic, workflow triggers, custom result pages.",
  },
};
