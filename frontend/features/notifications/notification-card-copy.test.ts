import { distinctNotificationBody } from "./notification-card-copy";

describe("distinctNotificationBody", () => {
  it("hides a body that repeats the title", () => {
    expect(
      distinctNotificationBody("Survey response received", "Survey response received"),
    ).toBeNull();
  });

  it("hides a body that repeats the title ignoring case and padding", () => {
    expect(
      distinctNotificationBody("Ticket Assigned to You", "  ticket assigned to you  "),
    ).toBeNull();
  });

  it("keeps a body that adds information", () => {
    expect(
      distinctNotificationBody(
        "Ticket Assigned to You",
        'You have been assigned to ticket "Mail error" (TASK).',
      ),
    ).toBe('You have been assigned to ticket "Mail error" (TASK).');
  });
});
