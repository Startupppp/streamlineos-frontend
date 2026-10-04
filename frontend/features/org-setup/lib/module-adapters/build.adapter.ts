import type { FrontendModuleAdapter } from "./index";

const BUILD_KNOWN_KEYS = new Set(["teamSize", "primaryUseCase"]);

export const buildAdapter: FrontendModuleAdapter = {
  moduleKey: "build",
  adaptiveQuestions: [
    {
      key: "teamSize",
      label: "How large is your development team?",
      type: "select",
      options: ["1-5", "6-20", "21-100", "100+"],
    },
    {
      key: "primaryUseCase",
      label: "Primary use case",
      type: "text",
    },
  ],
  validateAnswers: (answers) => {
    const errors: string[] = [];
    for (const key of Object.keys(answers)) {
      if (!BUILD_KNOWN_KEYS.has(key)) errors.push(`Unknown field: ${key}`);
    }
    return { valid: errors.length === 0, errors };
  },
  defaultAnswers: {},
};
