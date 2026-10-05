export type AdaptiveQuestion = {
  key: string;
  label: string;
  type: "text" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
};

export type ModuleAnswers = Record<string, string | boolean | string[]>;

export interface FrontendModuleAdapter {
  moduleKey: string;
  adaptiveQuestions: AdaptiveQuestion[];
  validateAnswers: (answers: ModuleAnswers) => { valid: boolean; errors: string[] };
  defaultAnswers: ModuleAnswers;
}
