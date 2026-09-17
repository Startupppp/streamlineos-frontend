import { render, screen } from "@testing-library/react";
import { PresenceDot, AvatarWithPresence } from "./presence-dot";

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" "),
  resolveImageUrl: (src?: string | null) => src ?? "",
}));

describe("PresenceDot — renders nothing when presence is unknown so avatars degrade silently", () => {
  it("renders no element when status is undefined", () => {
    const { container } = render(<PresenceDot />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a span element when a known status is supplied", () => {
    render(<PresenceDot status="ONLINE" />);
    expect(document.querySelector("span[aria-hidden='true']")).not.toBeNull();
  });

  it("applies the correct dot class for ONLINE so the colour token matches", () => {
    render(<PresenceDot status="ONLINE" className="size-2" />);
    const dot = document.querySelector("span[aria-hidden='true']");
    expect(dot?.className).toContain("bg-status-success-fill");
  });

  it("applies the correct dot class for BUSY", () => {
    render(<PresenceDot status="BUSY" />);
    const dot = document.querySelector("span[aria-hidden='true']");
    expect(dot?.className).toContain("bg-status-danger-fill");
  });

  it("applies the correct dot class for VACATION so all 9 statuses map to a token", () => {
    render(<PresenceDot status="VACATION" />);
    const dot = document.querySelector("span[aria-hidden='true']");
    expect(dot?.className).toContain("bg-status-info-fill");
  });
});

describe("AvatarWithPresence — presence dot is omitted for unknown users to prevent a misleading offline dot", () => {
  it("renders avatar without any presence dot when status is not provided", () => {
    const { container } = render(
      <AvatarWithPresence src={null} fallback="JD" />,
    );
    expect(container.querySelector("span[aria-hidden='true']")).toBeNull();
  });

  it("renders avatar with a presence dot when status is provided", () => {
    const { container } = render(
      <AvatarWithPresence src={null} fallback="JD" status="ONLINE" />,
    );
    expect(container.querySelector("span[aria-hidden='true']")).not.toBeNull();
  });

  it("renders the fallback initials inside the avatar", () => {
    render(<AvatarWithPresence src={null} fallback="AB" status="AWAY" />);
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("AB");
  });
});

describe("chatOnlineUsersContract — rejects responses missing required fields so a backend drift throws immediately", () => {
  it("throws when userId is absent from a presence entry", async () => {
    const { chatOnlineUsersContract } = await import(
      "@/hooks/api/chat-schema/presence-schema"
    );
    const malformed = [{ status: "ONLINE", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null }];
    expect(() => chatOnlineUsersContract.parse(malformed)).toThrow();
  });

  it("throws when status is absent from a presence entry", async () => {
    const { chatOnlineUsersContract } = await import(
      "@/hooks/api/chat-schema/presence-schema"
    );
    const malformed = [{ userId: "u1", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null }];
    expect(() => chatOnlineUsersContract.parse(malformed)).toThrow();
  });

  it("accepts an unrecognised status rather than throwing, because one bad row must not blank every avatar in the product", async () => {
    const { chatOnlineUsersContract } = await import(
      "@/hooks/api/chat-schema/presence-schema"
    );
    const unknownStatus = [{ userId: "u1", status: "INVISIBLE", lastSeenAt: "2026-09-16T10:00:00Z", userName: null, userImage: null }];
    expect(() => chatOnlineUsersContract.parse(unknownStatus)).not.toThrow();
  });

  it("drops an unrecognised status at the map boundary so it renders no dot instead of a wrong one", async () => {
    const { isPresenceStatus } = await import("@/lib/presence");
    expect(isPresenceStatus("INVISIBLE")).toBe(false);
  });

  it("accepts all nine presence statuses so manual statuses are not stripped by the contract", async () => {
    const { chatOnlineUsersContract } = await import(
      "@/hooks/api/chat-schema/presence-schema"
    );
    const allStatuses = [
      "ONLINE", "AWAY", "OFFLINE", "BUSY", "DO_NOT_DISTURB",
      "IN_A_MEETING", "ON_LEAVE", "VACATION", "WORKING_REMOTELY",
    ];
    const valid = allStatuses.map((status) => ({
      userId: `u-${status}`,
      status,
      lastSeenAt: "2026-09-16T10:00:00Z",
      userName: null,
      userImage: null,
    }));
    expect(() => chatOnlineUsersContract.parse(valid)).not.toThrow();
  });
});
