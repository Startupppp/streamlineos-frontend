import { activateClientFormSchema } from "./invite-client-schema";

describe("Activate client capabilities (portal grant)", () => {
  const base = {
    firstName: "Jane",
    email: "jane@build-verification.invalid",
    projectId: 29,
    canViewMilestones: false,
    canViewTasks: false,
    canViewAttachments: false,
    canViewComments: false,
    canSubmitChangeRequests: false,
  };

  it("rejects activation when every capability is off", () => {
    const result = activateClientFormSchema.safeParse(base);
    expect(result.success).toBe(false);
  });

  it("accepts activation when at least one capability is on", () => {
    const result = activateClientFormSchema.safeParse({
      ...base,
      canViewTasks: true,
    });
    expect(result.success).toBe(true);
  });
});
