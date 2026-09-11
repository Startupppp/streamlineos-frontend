import { queryKeyBase as base, type QueryKeyParams } from "./base";

export const knowledgeAndSurveysQueryKeys = {
  kb: {
    all: [...base, "kb"] as const,
    kbPages: () => [...base, "kb", "pages"] as const,
    pagesTree: () => [...base, "kb", "pages", "tree"] as const,
    pagesTreeByProject: (projectId: number) =>
      [...base, "kb", "pages", "tree", "project", projectId] as const,
    pagesRecent: () => [...base, "kb", "pages", "recent"] as const,
    pagesFavorites: () => [...base, "kb", "pages", "favorites"] as const,
    pagesTrash: () => [...base, "kb", "pages", "trash"] as const,
    pagesSearch: (searchQuery: string, aclVersion: string) =>
      [...base, "kb", "pages", "search", searchQuery, aclVersion] as const,
    page: (pageId: number) => [...base, "kb", "pages", pageId] as const,
    pageBacklinks: (pageId: number) =>
      [...base, "kb", "pages", pageId, "backlinks"] as const,
    pageVersions: (pageId: number) =>
      [...base, "kb", "pages", pageId, "versions"] as const,
    pageVersion: (pageId: number, versionNumber: number) =>
      [...base, "kb", "pages", pageId, "versions", versionNumber] as const,
    pageComments: (pageId: number) =>
      [...base, "kb", "pages", pageId, "comments"] as const,
    pageTemplates: () => [...base, "kb", "page-templates"] as const,
    spaces: () => [...base, "kb", "spaces"] as const,
    space: (spaceId: number) => [...base, "kb", "space", spaceId] as const,
    search: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "kb", "search"] as const)
        : ([...base, "kb", "search", params] as const),
    chatConversations: () => [...base, "kb", "chatConversations"] as const,
    chatConversationMessages: (conversationId: number) =>
      [...base, "kb", "chatConversations", conversationId, "messages"] as const,
    analyticsOverview: (range?: QueryKeyParams) =>
      range === undefined
        ? ([...base, "kb", "analyticsOverview"] as const)
        : ([...base, "kb", "analyticsOverview", range] as const),
    noResults: (range?: QueryKeyParams) =>
      range === undefined
        ? ([...base, "kb", "noResults"] as const)
        : ([...base, "kb", "noResults", range] as const),
    pageReviews: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "kb", "pageReviews"] as const)
        : ([...base, "kb", "pageReviews", params] as const),
    pageReviewsDue: () => [...base, "kb", "pageReviewsDue"] as const,
    pageRecordLinks: (pageId: number) =>
      [...base, "kb", "pages", pageId, "record-links"] as const,
    importJobs: () => [...base, "kb", "import-jobs"] as const,
    exportJobs: () => [...base, "kb", "export-jobs"] as const,
    articleMigrationPreview: () =>
      [...base, "kb", "article-migration", "preview"] as const,
    pageAnalytics: () => [...base, "kb", "pageAnalytics"] as const,
    knowledgeGaps: (range?: QueryKeyParams) =>
      range === undefined
        ? ([...base, "kb", "knowledgeGaps"] as const)
        : ([...base, "kb", "knowledgeGaps", range] as const),
    contentGaps: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "kb", "content-gaps"] as const)
        : ([...base, "kb", "content-gaps", params] as const),
    researchBriefs: (limit?: number) =>
      limit === undefined
        ? ([...base, "kb", "research-briefs"] as const)
        : ([...base, "kb", "research-briefs", limit] as const),
    researchBrief: (researchBriefId: number) =>
      [...base, "kb", "research-brief", researchBriefId] as const,
    settings: () => [...base, "kb", "settings"] as const,
    sources: () => [...base, "kb", "sources"] as const,
  },

  roadmap: {
    all: [...base, "roadmap"] as const,
    items: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "roadmap", "items"] as const)
        : ([...base, "roadmap", "items", params] as const),
    item: (roadmapItemId: number) =>
      [...base, "roadmap", "item", roadmapItemId] as const,
    feedback: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "roadmap", "feedback"] as const)
        : ([...base, "roadmap", "feedback", params] as const),
    changelog: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "roadmap", "changelog"] as const)
        : ([...base, "roadmap", "changelog", params] as const),
    publicBoard: (orgId: string) =>
      [...base, "roadmap", "publicBoard", orgId] as const,
  },

  automations: {
    all: [...base, "automations"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "automations", "list"] as const)
        : ([...base, "automations", "list", params] as const),
    detail: (automationId: number) =>
      [...base, "automations", "detail", automationId] as const,
    runs: (ruleId: number) => [...base, "automations", "runs", ruleId] as const,
  },

  nps: {
    publicSurvey: (token: string) =>
      [...base, "nps", "publicSurvey", token] as const,
  },

  surveys: {
    all: [...base, "surveys"] as const,
    list: (params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "surveys", "list"] as const)
        : ([...base, "surveys", "list", params] as const),
    detail: (surveyId: number) =>
      [...base, "surveys", "detail", surveyId] as const,
    templates: () => [...base, "surveys", "templates"] as const,
    builder: (surveyId: number) =>
      [...base, "surveys", "builder", surveyId] as const,
    collectors: (surveyId: number) =>
      [...base, "surveys", "collectors", surveyId] as const,
    participants: (surveyId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "surveys", "participants", surveyId] as const)
        : ([...base, "surveys", "participants", surveyId, params] as const),
    publicSurvey: (token: string) =>
      [...base, "surveys", "publicSurvey", token] as const,
    assessmentAttempts: (surveyId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "surveys", "assessmentAttempts", surveyId] as const)
        : ([...base, "surveys", "assessmentAttempts", surveyId, params] as const),
    certificates: (surveyId: number) =>
      [...base, "surveys", "certificates", surveyId] as const,
    liveSession: (sessionId: number) =>
      [...base, "surveys", "liveSession", sessionId] as const,
    publicLiveSession: (sessionCode: string) =>
      [...base, "surveys", "publicLiveSession", sessionCode] as const,
    analyticsOverview: (surveyId: number) =>
      [...base, "surveys", "analyticsOverview", surveyId] as const,
    analyticsQuestions: (surveyId: number) =>
      [...base, "surveys", "analyticsQuestions", surveyId] as const,
    responses: (surveyId: number, params?: QueryKeyParams) =>
      params === undefined
        ? ([...base, "surveys", "responses", surveyId] as const)
        : ([...base, "surveys", "responses", surveyId, params] as const),
    response: (surveyId: number, sessionId: number) =>
      [...base, "surveys", "response", surveyId, sessionId] as const,
    automations: (surveyId: number) =>
      [...base, "surveys", "automations", surveyId] as const,
  },

} as const;
