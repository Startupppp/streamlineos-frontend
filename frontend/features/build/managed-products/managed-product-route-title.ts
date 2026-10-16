export const MANAGED_PRODUCT_ROUTE_TITLES = {
  overview: "Overview",
  feedback: "Feedback",
  insights: "Insights",
  roadmap: "Roadmap",
  releases: "Releases",
  goals: "Goals & OKRs",
  projects: "Linked Projects",
  settings: "Settings",
} as const;

export function managedProductRouteTitle(pathname: string): string {
  const match = pathname.match(/\/build\/managed-products\/[^/]+(?:\/([^/?#]+))?/);
  switch (match?.[1]) {
    case "feedback":
      return MANAGED_PRODUCT_ROUTE_TITLES.feedback;
    case "insights":
      return MANAGED_PRODUCT_ROUTE_TITLES.insights;
    case "roadmap":
      return MANAGED_PRODUCT_ROUTE_TITLES.roadmap;
    case "releases":
      return MANAGED_PRODUCT_ROUTE_TITLES.releases;
    case "goals":
      return MANAGED_PRODUCT_ROUTE_TITLES.goals;
    case "projects":
      return MANAGED_PRODUCT_ROUTE_TITLES.projects;
    case "settings":
      return MANAGED_PRODUCT_ROUTE_TITLES.settings;
    default:
      return MANAGED_PRODUCT_ROUTE_TITLES.overview;
  }
}
