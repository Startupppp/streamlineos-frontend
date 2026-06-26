import type { JobPosting } from "@/types/hr/recruitment";
import type { CreateJobFormValues } from "./schema";

function extractSection(text: string, section: string): string {
  const marker = `=== ${section} ===`;
  const idx = text.indexOf(marker);
  if (idx === -1) return "";
  const start = idx + marker.length;
  const nextIdx = text.indexOf("===", start + 1);
  const end = nextIdx === -1 ? text.length : text.lastIndexOf("\n", nextIdx);
  return text.slice(start, end).trim();
}

export function parseJobToFormValues(job: JobPosting): Partial<CreateJobFormValues> {
  const values: Partial<CreateJobFormValues> = {};

  values.title = job.title ?? "";

  if (job.departmentId != null) {
    values.departmentId = String(job.departmentId);
  }

  if (job.location) {
    const commaIdx = job.location.lastIndexOf(",");
    if (commaIdx > 0) {
      values.stateCity = job.location.slice(0, commaIdx).trim();
      values.country = job.location.slice(commaIdx + 1).trim();
    } else {
      values.stateCity = job.location;
      values.country = "";
    }
  }

  if (job.type) {
    values.jobType = job.type as CreateJobFormValues["jobType"];
  }

  if (job.experience) {
    const pipeIdx = job.experience.indexOf(" | ");
    const expPart = pipeIdx > -1 ? job.experience.slice(0, pipeIdx) : job.experience;
    const minMatch = expPart.match(/^(\d+)/);
    if (minMatch) values.minExperience = parseInt(minMatch[1], 10);
    const maxMatch = expPart.match(/[–\-](\d+)/);
    if (maxMatch) values.maxExperience = parseInt(maxMatch[1], 10);
    if (pipeIdx > -1) {
      values.educationLevel = job.experience.slice(pipeIdx + 3).trim();
    }
  }

  if (job.salaryMin) values.salaryMin = parseFloat(job.salaryMin) || undefined;
  if (job.salaryMax) values.salaryMax = parseFloat(job.salaryMax) || undefined;

  values.openings = job.openings ?? 1;
  values.status = (job.status as CreateJobFormValues["status"]) ?? "DRAFT";

  if (job.applicationDeadline) {
    values.applicationDeadline = String(job.applicationDeadline).slice(0, 10);
  }

  if (job.benefits) values.benefits = job.benefits;

  if (job.description) {
    const desc = job.description;
    const overview = extractSection(desc, "OVERVIEW");
    if (overview) values.overview = overview;
    const responsibilities = extractSection(desc, "RESPONSIBILITIES");
    if (responsibilities) values.responsibilities = responsibilities;
    const workMode = extractSection(desc, "WORK MODE");
    if (workMode) values.workMode = workMode as CreateJobFormValues["workMode"];
    const requiredSkillsText = extractSection(desc, "REQUIRED SKILLS");
    if (requiredSkillsText) {
      values.requiredSkills = requiredSkillsText.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const preferredSkillsText = extractSection(desc, "PREFERRED SKILLS");
    if (preferredSkillsText) {
      values.preferredSkills = preferredSkillsText.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const hiringManager = extractSection(desc, "HIRING MANAGER");
    if (hiringManager) values.hiringManager = hiringManager;
    const interviewRoundsText = extractSection(desc, "INTERVIEW ROUNDS");
    if (interviewRoundsText) {
      values.interviewRounds = interviewRoundsText.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const visibility = extractSection(desc, "VISIBILITY");
    if (visibility) values.visibility = visibility as CreateJobFormValues["visibility"];
    const priority = extractSection(desc, "PRIORITY");
    if (priority) values.priority = priority as CreateJobFormValues["priority"];
  }

  if (job.requirements) {
    const parts = job.requirements.split("\n\n");
    const reqText = parts.filter((p) => !p.startsWith("Education:") && !p.startsWith("Tags:")).join("\n\n").trim();
    if (reqText) values.jobRequirements = reqText;
    const eduLine = parts.find((p) => p.startsWith("Education:"));
    if (eduLine && !values.educationLevel) {
      values.educationLevel = eduLine.replace("Education:", "").trim();
    }
    const tagsLine = parts.find((p) => p.startsWith("Tags:"));
    if (tagsLine) {
      values.tags = tagsLine.replace("Tags:", "").trim().split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  return values;
}
