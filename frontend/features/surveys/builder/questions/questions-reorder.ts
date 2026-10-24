import type { ReorderInput, SurveyBuilderViewSection } from "@/hooks/api/surveys/builder";

export const SECTION_DND_TYPE = "SURVEY_SECTION";
export const QUESTION_DND_TYPE = "SURVEY_QUESTION";
export const SECTIONS_DROPPABLE_ID = "sections";

export function questionDroppableId(sectionId: number): string {
  return `questions:${sectionId}`;
}

export function sectionDragId(sectionId: number): string {
  return `section:${sectionId}`;
}

export function questionDragId(questionId: number): string {
  return `question:${questionId}`;
}

interface DropLocation {
  droppableId: string;
  index: number;
}

export interface BuilderDrop {
  type?: string;
  source: DropLocation;
  destination: DropLocation | null;
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] | null {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return null;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return null;
  next.splice(to, 0, moved);
  return next;
}

function parseSectionId(droppableId: string): number | null {
  const match = /^questions:(\d+)$/.exec(droppableId);
  if (!match) return null;
  const sectionId = Number(match[1]);
  return Number.isInteger(sectionId) ? sectionId : null;
}

export function applyBuilderDrop(
  sections: readonly SurveyBuilderViewSection[],
  drop: BuilderDrop,
): { sections: SurveyBuilderViewSection[]; reorder: ReorderInput } | null {
  const destination = drop.destination;
  if (!destination) return null;
  if (destination.droppableId === drop.source.droppableId && destination.index === drop.source.index) return null;

  if (drop.type === SECTION_DND_TYPE) {
    const moved = moveItem(sections, drop.source.index, destination.index);
    if (!moved) return null;
    const next = moved.map((section, index) => ({ ...section, sortOrder: index }));
    return {
      sections: next,
      reorder: { sections: next.map((section) => ({ id: section.id, sortOrder: section.sortOrder })) },
    };
  }

  if (drop.type !== QUESTION_DND_TYPE) return null;
  const sourceSectionId = parseSectionId(drop.source.droppableId);
  const destinationSectionId = parseSectionId(destination.droppableId);
  if (sourceSectionId == null || destinationSectionId == null) return null;

  const sourceSection = sections.find((section) => section.id === sourceSectionId);
  const destinationSection = sections.find((section) => section.id === destinationSectionId);
  if (!sourceSection || !destinationSection) return null;

  const sourceQuestions = [...sourceSection.questions].sort((a, b) => a.sortOrder - b.sortOrder);
  const moving = sourceQuestions[drop.source.index];
  if (!moving) return null;

  if (sourceSectionId === destinationSectionId) {
    const reordered = moveItem(sourceQuestions, drop.source.index, destination.index);
    if (!reordered) return null;
    const questions = reordered.map((question, index) => ({ ...question, sortOrder: index }));
    return {
      sections: sections.map((section) => (section.id === sourceSectionId ? { ...section, questions } : section)),
      reorder: {
        questions: questions.map((question) => ({
          id: question.id,
          sectionId: sourceSectionId,
          sortOrder: question.sortOrder,
        })),
      },
    };
  }

  const destinationQuestions = [...destinationSection.questions].sort((a, b) => a.sortOrder - b.sortOrder);
  sourceQuestions.splice(drop.source.index, 1);
  destinationQuestions.splice(destination.index, 0, moving);
  const nextSource = sourceQuestions.map((question, index) => ({ ...question, sortOrder: index }));
  const nextDestination = destinationQuestions.map((question, index) => ({ ...question, sortOrder: index }));

  return {
    sections: sections.map((section) => {
      if (section.id === sourceSectionId) return { ...section, questions: nextSource };
      if (section.id === destinationSectionId) return { ...section, questions: nextDestination };
      return section;
    }),
    reorder: {
      questions: [
        ...nextSource.map((question) => ({
          id: question.id,
          sectionId: sourceSectionId,
          sortOrder: question.sortOrder,
        })),
        ...nextDestination.map((question) => ({
          id: question.id,
          sectionId: destinationSectionId,
          sortOrder: question.sortOrder,
        })),
      ],
    },
  };
}
