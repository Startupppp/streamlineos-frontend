import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";

jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
jest.mock("@/lib/rbac/route-access/enforce-route-access", () => ({ enforceRouteAccess: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/prefetch/build", () => ({ prefetchBuildProject: jest.fn().mockResolvedValue({ project: { id: 1 }, state: { mutations: [], queries: [] } }) }));
jest.mock("@/features/build/sidebar/remember-last-project", () => ({ RememberLastProject: () => null }));
jest.mock("@/features/build/project-detail/project-hydration-context", () => ({ ProjectHydrationProvider: ({ children }: { children: ReactNode }) => <>{children}</> }));
jest.mock("@/features/build/ticket-details/ticket-panel-inner", () => ({
  TicketPanelInner: ({ projectId, ticketKey, returnTo }: { projectId: number; ticketKey: string; returnTo: string | null }) => <div>Intercepted ticket {projectId}:{ticketKey} return {returnTo}</div>,
}));
jest.mock("@/features/build/ticket-details/ticket-detail-page", () => ({
  TicketDetailPage: ({ projectId, ticketKey }: { projectId: number; ticketKey: string }) => <div>Direct ticket {projectId}:{ticketKey}</div>,
}));

import ProjectLayout from "./layout";
import ProjectChildrenFallback from "./default";
import PanelFallback from "./@panel/default";
import InterceptedTicketRoute from "./@panel/(.)tickets/[ticketKey]/page";
import DirectTicketRoute from "./tickets/[ticketKey]/page";

it("provides a children fallback when global My Work enters the intercepted ticket slot", async () => {
  const panel = await InterceptedTicketRoute({ params: Promise.resolve({ projectId: "1", ticketKey: "123" }), searchParams: Promise.resolve({ returnTo: "/build/my-work?section=drafts" }) });
  const layout = await ProjectLayout({ children: <ProjectChildrenFallback />, panel, params: Promise.resolve({ projectId: "1" }) });
  render(<QueryClientProvider client={createAppQueryClient()}>{layout}</QueryClientProvider>);
  expect(screen.getByText("Intercepted ticket 1:123 return /build/my-work?section=drafts")).toBeInTheDocument();
  expect(ProjectChildrenFallback()).toBeNull();
});

it("retains the normal ticket route with an unmatched panel fallback on a direct load", async () => {
  const children = await DirectTicketRoute({ params: Promise.resolve({ projectId: "1", ticketKey: "STRE-123" }) });
  const layout = await ProjectLayout({ children, panel: <PanelFallback />, params: Promise.resolve({ projectId: "1" }) });
  render(<QueryClientProvider client={createAppQueryClient()}>{layout}</QueryClientProvider>);
  expect(screen.getByText("Direct ticket 1:STRE-123")).toBeInTheDocument();
  expect(PanelFallback()).toBeNull();
});
