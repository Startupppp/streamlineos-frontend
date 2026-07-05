export interface AnswerValue {
  answerValue?: unknown;
  answerText?: string;
  choiceIds?: number[];
}

export interface QuestionInputProps {
  question: {
    id: number;
    type: string;
    title: string;
    description: string | null;
    required: boolean;
    settings: Record<string, unknown>;
    choices: Array<{ id: number; label: string; choiceKey: string }>;
  };
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}
