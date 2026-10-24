import type { SurveyBuilderViewSection } from "@/hooks/api/surveys/builder";
import { QUESTION_DND_TYPE, SECTION_DND_TYPE, applyBuilderDrop, questionDroppableId } from "./questions-reorder";

function question(id: number, sortOrder: number): SurveyBuilderViewSection["questions"][number] {
  return {
    id,
    questionKey: `q-${id}`,
    variableName: null,
    type: "short_text",
    title: `Question ${id}`,
    description: null,
    required: false,
    settings: {},
    validation: {},
    scoring: {},
    sortOrder,
    choices: [],
  };
}

function section(id: number, sortOrder: number, questions: SurveyBuilderViewSection["questions"]): SurveyBuilderViewSection {
  return {
    id,
    title: `Section ${id}`,
    description: null,
    sortOrder,
    settings: {},
    questions,
  };
}

const sections = [
  section(1, 0, [question(11, 0), question(12, 1)]),
  section(2, 1, [question(21, 0)]),
];

describe("survey builder drag reorder", () => {
  it("reorders sections and renumbers sort order", () => {
    const result = applyBuilderDrop(sections, {
      type: SECTION_DND_TYPE,
      source: { droppableId: "sections", index: 0 },
      destination: { droppableId: "sections", index: 1 },
    });

    expect(result?.sections.map((item) => item.id)).toEqual([2, 1]);
    expect(result?.reorder.sections).toEqual([
      { id: 2, sortOrder: 0 },
      { id: 1, sortOrder: 1 },
    ]);
    expect(result?.sections[1]?.questions.map((item) => item.id)).toEqual([11, 12]);
  });

  it("reorders a question inside its section", () => {
    const result = applyBuilderDrop(sections, {
      type: QUESTION_DND_TYPE,
      source: { droppableId: questionDroppableId(1), index: 0 },
      destination: { droppableId: questionDroppableId(1), index: 1 },
    });

    expect(result?.sections[0]?.questions.map((item) => [item.id, item.sortOrder])).toEqual([
      [12, 0],
      [11, 1],
    ]);
    expect(result?.reorder.questions).toEqual([
      { id: 12, sectionId: 1, sortOrder: 0 },
      { id: 11, sectionId: 1, sortOrder: 1 },
    ]);
  });

  it("moves a question into another section", () => {
    const result = applyBuilderDrop(sections, {
      type: QUESTION_DND_TYPE,
      source: { droppableId: questionDroppableId(1), index: 1 },
      destination: { droppableId: questionDroppableId(2), index: 0 },
    });

    expect(result?.sections[0]?.questions.map((item) => item.id)).toEqual([11]);
    expect(result?.sections[1]?.questions.map((item) => item.id)).toEqual([12, 21]);
    expect(result?.reorder.questions).toEqual([
      { id: 11, sectionId: 1, sortOrder: 0 },
      { id: 12, sectionId: 2, sortOrder: 0 },
      { id: 21, sectionId: 2, sortOrder: 1 },
    ]);
  });

  it("ignores a drop that does not move", () => {
    expect(
      applyBuilderDrop(sections, {
        type: QUESTION_DND_TYPE,
        source: { droppableId: questionDroppableId(1), index: 0 },
        destination: { droppableId: questionDroppableId(1), index: 0 },
      }),
    ).toBeNull();
    expect(
      applyBuilderDrop(sections, {
        type: SECTION_DND_TYPE,
        source: { droppableId: "sections", index: 0 },
        destination: null,
      }),
    ).toBeNull();
  });
});
