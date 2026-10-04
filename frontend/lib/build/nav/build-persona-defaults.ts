import { BUILD_NAV_MAX_PINS } from "./build-nav-destination";

export type BuildPersona = "freelancer" | "pm" | "engineer" | "content" | "executive";

export interface BuildPersonaTemplate {
  id: BuildPersona;
  defaultPinIds: readonly string[];
}

export const BUILD_PERSONA_TEMPLATES: readonly BuildPersonaTemplate[] = [
  {
    id: "freelancer",
    defaultPinIds: ["my-work-assigned", "org-projects"],
  },
  {
    id: "pm",
    defaultPinIds: ["org-overview", "org-projects", "org-roadmap"],
  },
  {
    id: "engineer",
    defaultPinIds: ["my-work-assigned", "org-projects"],
  },
  {
    id: "content",
    defaultPinIds: ["my-work-assigned", "org-projects"],
  },
  {
    id: "executive",
    defaultPinIds: ["org-overview", "org-roadmap", "org-goals"],
  },
];

for (const template of BUILD_PERSONA_TEMPLATES) {
  if (template.defaultPinIds.length > BUILD_NAV_MAX_PINS) {
    throw new Error(
      `Persona "${template.id}" has ${template.defaultPinIds.length} default pins, exceeding BUILD_NAV_MAX_PINS (${BUILD_NAV_MAX_PINS})`,
    );
  }
}

export const BUILD_DEFAULT_PERSONA: BuildPersona = "pm";

export function getPersonaDefaultPinIds(persona: BuildPersona): readonly string[] {
  return (
    BUILD_PERSONA_TEMPLATES.find((t) => t.id === persona)?.defaultPinIds ?? []
  );
}
