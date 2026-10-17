import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeShareControls } from "./intake-share-controls";

const mockSettings = jest.fn();
const mockCan = jest.fn();
const mockPublish = jest.fn();
const mockUnpublish = jest.fn();
const mockToast = { success: jest.fn(), error: jest.fn() };

jest.mock("@/hooks/api/build/intake-settings", () => ({
  useIntakeSettings: (...args: unknown[]) => mockSettings(...args),
  usePublishIntake: () => ({ mutate: mockPublish, isPending: false }),
  useUnpublishIntake: () => ({ mutate: mockUnpublish, isPending: false }),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockCan(...args),
}));
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToast.success(...args),
    error: (...args: unknown[]) => mockToast.error(...args),
  },
}));

const PROJECT_ID = 1;
const TOKEN = "a1b2c3d4e5f6a1b2c3d4e5f6";
const writeText = jest.fn().mockResolvedValue(undefined);

const PUBLISHED = {
  projectId: PROJECT_ID,
  intakePublishedAt: "2026-10-01T00:00:00Z",
  intakeToken: TOKEN,
};
const UNPUBLISHED = {
  projectId: PROJECT_ID,
  intakePublishedAt: null,
  intakeToken: null,
};

function settingsResult(data: unknown) {
  return { data, isLoading: false, isError: false, error: undefined };
}

beforeEach(() => {
  jest.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  mockCan.mockReturnValue(true);
  mockSettings.mockReturnValue(settingsResult(PUBLISHED));
});

describe("the intake share address is the opaque token, never the project id", () => {
  it("copies /intake/t/<token>, so the address a customer receives does not enumerate project ids", async () => {
    render(<IntakeShareControls projectId={PROJECT_ID} />);

    await userEvent.click(screen.getByRole("button", { name: /copy intake link/i }));

    expect(writeText).toHaveBeenCalledWith(
      `http://localhost/intake/t/${TOKEN}`,
    );
  });

  it("never copies the guessable /intake/<projectId> address the page used to publish", async () => {
    render(<IntakeShareControls projectId={PROJECT_ID} />);

    await userEvent.click(screen.getByRole("button", { name: /copy intake link/i }));

    expect(writeText).not.toHaveBeenCalledWith(
      expect.stringContaining(`/intake/${PROJECT_ID}`),
    );
  });

  it("offers no address to copy while intake is unpublished, because the public form refuses every submission then", () => {
    mockSettings.mockReturnValue(settingsResult(UNPUBLISHED));

    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(
      screen.queryByRole("button", { name: /copy intake link/i }),
    ).not.toBeInTheDocument();
  });

  it("offers no address to copy before the settings read resolves, so no stale link is shared", () => {
    mockSettings.mockReturnValue(settingsResult(undefined));

    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(
      screen.queryByRole("button", { name: /copy intake link/i }),
    ).not.toBeInTheDocument();
  });
});

describe("publishing intake is reachable, so intake_published_at finally has a writer in the product", () => {
  it("shows the publish control to an actor who may manage the project's intake", () => {
    mockSettings.mockReturnValue(settingsResult(UNPUBLISHED));

    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(
      screen.getByRole("button", { name: /publish intake/i }),
    ).toBeInTheDocument();
  });

  it("hides the publish control from an actor who may not manage the project's intake", () => {
    mockCan.mockReturnValue(false);
    mockSettings.mockReturnValue(settingsResult(UNPUBLISHED));

    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(
      screen.queryByRole("button", { name: /publish intake/i }),
    ).not.toBeInTheDocument();
  });

  it("gates on the key the endpoint declares, so useCan cannot be true where the API says 403", () => {
    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(mockCan).toHaveBeenCalledWith("build:workspace:manage");
  });

  it("sends the publish command, so an unpublished project can start accepting submissions", async () => {
    mockSettings.mockReturnValue(settingsResult(UNPUBLISHED));

    render(<IntakeShareControls projectId={PROJECT_ID} />);
    await userEvent.click(screen.getByRole("button", { name: /publish intake/i }));

    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});

describe("unpublishing confirms first, because it rotates the token and kills every link already shared", () => {
  it("sends no command until the confirmation is accepted", async () => {
    render(<IntakeShareControls projectId={PROJECT_ID} />);

    await userEvent.click(screen.getByRole("button", { name: /unpublish intake/i }));

    expect(mockUnpublish).not.toHaveBeenCalled();
  });

  it("sends the unpublish command once the confirmation is accepted", async () => {
    render(<IntakeShareControls projectId={PROJECT_ID} />);

    await userEvent.click(screen.getByRole("button", { name: /unpublish intake/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /^stop accepting requests$/i }),
    );

    expect(mockUnpublish).toHaveBeenCalledTimes(1);
  });

  it("offers no unpublish control while intake is already unpublished", () => {
    mockSettings.mockReturnValue(settingsResult(UNPUBLISHED));

    render(<IntakeShareControls projectId={PROJECT_ID} />);

    expect(
      screen.queryByRole("button", { name: /unpublish intake/i }),
    ).not.toBeInTheDocument();
  });
});
