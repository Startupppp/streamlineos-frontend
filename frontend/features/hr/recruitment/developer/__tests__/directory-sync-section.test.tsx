import React from "react";
import { render, screen } from "@testing-library/react";

const useDirectorySyncState = jest.fn();

jest.mock("@/hooks/api/hr/recruitment/developer-sandbox", () => ({
  useDirectorySyncState: () => useDirectorySyncState(),
}));

import { DirectorySyncSection } from "../directory-sync-section";

const BLOCKED = [
  {
    capability: "SSO" as const,
    provider: {
      provider: "SSO",
      status: "BLOCKED" as const,
      code: "not-implemented",
      message:
        "Single sign-on for recruiters is not available yet. Recruiters sign in with Google or an email link. Google sign-in authenticates a Google account, not your directory — removing somebody from your IdP does not remove their access here, so revoke the membership as well.",
    },
    availableToday: "Google sign-in and magic-link sign-in, per user.",
  },
  {
    capability: "SCIM" as const,
    provider: {
      provider: "SCIM",
      status: "BLOCKED" as const,
      code: "not-implemented",
      message:
        "SCIM directory provisioning is not available yet. Add and remove recruiters through Settings.",
    },
    availableToday: "Manual invitations and the members API.",
  },
];

describe("DirectorySyncSection", () => {
  afterEach(() => {
    useDirectorySyncState.mockReset();
  });

  /**
   * The screen an administrator reads before writing "SSO: yes" on a security
   * questionnaire. If it ever renders anything that reads as supported, the
   * next thing that happens is somebody assuming IdP deprovisioning removes
   * access to candidate data here — which it does not.
   */
  it("says both are not available and never implies otherwise", () => {
    useDirectorySyncState.mockReturnValue({ data: BLOCKED, isLoading: false });
    render(<DirectorySyncSection />);

    expect(screen.getAllByText("Not available")).toHaveLength(2);
    expect(screen.queryByText(/Connected|Enabled|Active|Supported/i)).toBeNull();
  });

  it("carries the deprovisioning warning where an admin will read it", () => {
    useDirectorySyncState.mockReturnValue({ data: BLOCKED, isLoading: false });
    render(<DirectorySyncSection />);

    expect(screen.getByText(/does not remove their access here/)).toBeInTheDocument();
  });

  it("names what an administrator can do today", () => {
    useDirectorySyncState.mockReturnValue({ data: BLOCKED, isLoading: false });
    render(<DirectorySyncSection />);

    expect(screen.getByText(/Google sign-in and magic-link sign-in/)).toBeInTheDocument();
    expect(screen.getByText(/Manual invitations and the members API/)).toBeInTheDocument();
  });

  /**
   * Renders nothing while loading rather than an empty shell. A momentary blank
   * card headed "SSO" with no verdict is exactly the frame in which somebody
   * screenshots it and concludes it is configurable.
   */
  it("renders nothing while it does not know", () => {
    useDirectorySyncState.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<DirectorySyncSection />);
    expect(container).toBeEmptyDOMElement();
  });
});
