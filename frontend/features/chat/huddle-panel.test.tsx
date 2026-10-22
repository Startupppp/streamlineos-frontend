import { fireEvent, render, screen } from "@testing-library/react";
import { HuddlePanel } from "./huddle-panel";
import type { Huddle } from "@/types/chat";

const leaveMutate = jest.fn();
const heartbeat = jest.fn();

jest.mock("@/hooks/api/chat-huddles", () => ({
  useLeaveHuddle: () => ({ mutate: leaveMutate, isPending: false }),
  useHuddleHeartbeat: (...args: unknown[]) => heartbeat(...args),
  useInviteToHuddle: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./use-huddle-events", () => ({ useHuddleEvents: jest.fn() }));

const channelMembers = [
  { userId: "u-me", user: { id: "u-me", name: "Me", email: "me@x.io", image: null } },
  { userId: "u-ada", user: { id: "u-ada", name: "Ada", email: "ada@x.io", image: null } },
  { userId: "u-bo", user: { id: "u-bo", name: "Bo", email: "bo@x.io", image: null } },
];

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatChannel: () => ({ data: { members: channelMembers } }),
}));

const pickerCandidates = jest.fn();
jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: (props: { candidates?: Array<{ id: string }> }) => {
    pickerCandidates(props.candidates?.map((c) => c.id));
    return null;
  },
}));

function makeHuddle(overrides: Partial<Huddle>): Huddle {
  return {
    id: 11,
    channelId: 7,
    status: "active",
    calendarEventId: null,
    meetingProvider: "google_meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    startedAt: new Date().toISOString(),
    endedAt: null,
    startedBy: "u-ada",
    startedByUser: { id: "u-ada", name: "Ada" },
    participants: [
      {
        id: 1,
        huddleId: 11,
        joinedAt: new Date().toISOString(),
        leftAt: null,
        userId: "u-ada",
        user: { id: "u-ada", name: "Ada", image: null },
      },
    ],
    ...overrides,
  };
}

function renderPanel(huddle: Huddle) {
  render(<HuddlePanel huddle={huddle} channelId={7} currentUserId="u-me" />);
}

function expand() {
  fireEvent.click(screen.getByRole("button", { name: "Expand huddle panel" }));
}

beforeEach(() => jest.clearAllMocks());

describe("HuddlePanel provider awareness", () => {
  it("labels the join link Join Google Meet for a Meet huddle", () => {
    renderPanel(makeHuddle({ meetingProvider: "google_meet" }));
    expand();
    expect(screen.getByRole("link", { name: /Join Google Meet/ })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("labels the join link Join Microsoft Teams for a Teams huddle", () => {
    renderPanel(makeHuddle({ meetingProvider: "microsoft_teams", meetingUrl: "https://teams.microsoft.com/l/meetup-join/x" }));
    expand();
    expect(screen.getByRole("link", { name: /Join Microsoft Teams/ })).toBeInTheDocument();
  });

  it("labels Join external meeting for a legacy huddle without a provider", () => {
    renderPanel(makeHuddle({ meetingProvider: null }));
    expand();
    expect(screen.getByRole("link", { name: /Join external meeting/ })).toBeInTheDocument();
    expect(screen.getByText("External meeting")).toBeInTheDocument();
  });

  it("names the starter and counts people who joined through StreamlineOS", () => {
    renderPanel(makeHuddle({}));
    expect(screen.getByText("1 joined through StreamlineOS")).toBeInTheDocument();
    expand();
    expect(screen.getByText("Started by Ada")).toBeInTheDocument();
  });

  it("passes the channel to the heartbeat so a refusal can refresh the right huddle", () => {
    renderPanel(makeHuddle({}));
    expect(heartbeat).toHaveBeenCalledWith(11, 7, false);
  });

  it("collapsed mini bar join link carries the provider name for assistive tech", () => {
    renderPanel(makeHuddle({ meetingProvider: "microsoft_teams" }));
    expect(screen.getByRole("link", { name: "Join Microsoft Teams" })).toBeInTheDocument();
  });
});

describe("HuddlePanel invite picker", () => {
  it("offers only channel members who are not already in the huddle, because the server refuses anyone else", () => {
    renderPanel(makeHuddle({}));
    expand();
    fireEvent.click(screen.getByRole("button", { name: "Invite users" }));
    expect(pickerCandidates).toHaveBeenLastCalledWith(["u-bo"]);
  });
});
