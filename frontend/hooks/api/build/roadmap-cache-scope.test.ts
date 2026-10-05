import { readFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";

const SOURCES: Record<string, string> = {
  "roadmap.ts": readFileSync(join(__dirname, "roadmap.ts"), "utf8"),
  "feedback-posts.ts": readFileSync(join(__dirname, "feedback-posts.ts"), "utf8"),
  "changelog.ts": readFileSync(join(__dirname, "changelog.ts"), "utf8"),
};

function invalidationsIn(hookName: string): string {
  for (const src of Object.values(SOURCES)) {
    const start = src.indexOf(`export function ${hookName}(`);
    if (start === -1) continue;
    const next = src.indexOf("\nexport function ", start + 1);
    return src.slice(start, next === -1 ? undefined : next);
  }
  throw new Error(`Hook ${hookName} not found in any source file`);
}

const ROADMAP_WRITES = [
  "useCreateRoadmapItem",
  "useUpdateRoadmapItem",
  "useDeleteRoadmapItem",
];
const FEEDBACK_WRITES = [
  "useUpdateFeedbackPost",
  "useMergeFeedbackPost",
  "useDeleteFeedbackPost",
];
const CHANGELOG_WRITES = [
  "useCreateChangelogEntry",
  "useUpdateChangelogEntry",
  "useDeleteChangelogEntry",
];

describe("roadmap cache invalidation is scoped to the reports a write actually changes", () => {
  it.each([...ROADMAP_WRITES, ...FEEDBACK_WRITES, ...CHANGELOG_WRITES])(
    "%s does not invalidate the whole roadmap domain",
    (hook) => {
      expect(invalidationsIn(hook)).not.toContain("roadmap.all");
    },
  );

  it.each(ROADMAP_WRITES)("%s invalidates the roadmap board", (hook) => {
    expect(invalidationsIn(hook)).toContain("roadmap.items()");
  });

  it.each(ROADMAP_WRITES)("%s leaves the changelog alone", (hook) => {
    expect(invalidationsIn(hook)).not.toContain("roadmap.changelog");
  });

  it.each(["useUpdateRoadmapItem", "useDeleteRoadmapItem"])(
    "%s invalidates the single item it touched, which also covers its signals",
    (hook) => {
      expect(invalidationsIn(hook)).toContain("roadmap.item(");
    },
  );

  it.each(FEEDBACK_WRITES)(
    "%s invalidates the feedback list and the board, because a linked post moves the item's demand and tier weighting",
    (hook) => {
      const body = invalidationsIn(hook);
      expect(body).toContain("roadmap.feedback()");
      expect(body).toContain("roadmap.items()");
      expect(body).toContain("roadmap.itemRoot");
    },
  );

  it.each(FEEDBACK_WRITES)("%s leaves the changelog alone", (hook) => {
    expect(invalidationsIn(hook)).not.toContain("roadmap.changelog");
  });

  it.each(CHANGELOG_WRITES)(
    "%s invalidates only the changelog, which neither the board nor feedback reads",
    (hook) => {
      const body = invalidationsIn(hook);
      expect(body).toContain("roadmap.changelog()");
      expect(body).not.toContain("roadmap.items()");
      expect(body).not.toContain("roadmap.feedback()");
    },
  );
});

describe("the narrowed keys still prefix-match what they must reach", () => {
  it("invalidating one item also reaches that item's signals, which is where the tier weighting lives", () => {
    const item = knowledgeAndSurveysQueryKeys.roadmap.item(7);
    const signals = knowledgeAndSurveysQueryKeys.roadmap.itemSignals(7);
    expect(signals.slice(0, item.length)).toEqual([...item]);
  });

  it("invalidating the item root reaches every item signal query", () => {
    const itemRoot = knowledgeAndSurveysQueryKeys.roadmap.itemRoot;
    const signals = knowledgeAndSurveysQueryKeys.roadmap.itemSignals(7);
    expect(signals.slice(0, itemRoot.length)).toEqual([...itemRoot]);
  });

  it("invalidating the board with no params reaches every filtered board page", () => {
    const board = knowledgeAndSurveysQueryKeys.roadmap.items();
    const filtered = knowledgeAndSurveysQueryKeys.roadmap.items({ status: "planned" });
    expect(filtered.slice(0, board.length)).toEqual([...board]);
  });

  it("the changelog key does not prefix the board, so a changelog write cannot reach it", () => {
    const changelog = knowledgeAndSurveysQueryKeys.roadmap.changelog();
    const board = knowledgeAndSurveysQueryKeys.roadmap.items();
    expect(board.slice(0, changelog.length)).not.toEqual([...changelog]);
  });

  it("every roadmap key stays under the roadmap domain, so none can reach another tenant's or module's cache", () => {
    const domain = knowledgeAndSurveysQueryKeys.roadmap.all;
    for (const key of [
      knowledgeAndSurveysQueryKeys.roadmap.items(),
      knowledgeAndSurveysQueryKeys.roadmap.feedback(),
      knowledgeAndSurveysQueryKeys.roadmap.changelog(),
      knowledgeAndSurveysQueryKeys.roadmap.item(1),
    ])
      expect(key.slice(0, domain.length)).toEqual([...domain]);
  });

  it("bite proof: the domain key still prefixes all four, which is why it was too broad", () => {
    const domain = knowledgeAndSurveysQueryKeys.roadmap.all;
    const changelog = knowledgeAndSurveysQueryKeys.roadmap.changelog();
    expect(changelog.slice(0, domain.length)).toEqual([...domain]);
  });
});
