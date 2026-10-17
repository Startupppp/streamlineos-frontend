export interface QuestionFormState {
  question: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role: string;
  roleInput: string;
  tags: string;
  sampleAnswer: string;
  keywords: string;
}

export const EMPTY_FORM: QuestionFormState = {
  question: "",
  category: "GENERAL",
  difficulty: "MEDIUM",
  role: "",
  roleInput: "",
  tags: "",
  sampleAnswer: "",
  keywords: "",
};
