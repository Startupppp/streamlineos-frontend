import { questionEditorSessionKey } from "./question-editor-sheet";

it("changes editor identity across close, reopen, and question switches", () => {
  expect(questionEditorSessionKey(true, 1, 10)).toBe("open:1:10");
  expect(questionEditorSessionKey(false, 1, 10)).toBe("closed:1:10");
  expect(questionEditorSessionKey(true, 2, 10)).toBe("open:2:10");
  expect(questionEditorSessionKey(true, null, 11)).toBe("open:new:11");
});
