import { captureSubmissionSchema } from "./capture-submission-schema";

describe("captureSubmissionSchema", () => {
  it("trims the optional identity and classification fields sent to the API", () => {
    const parsed = captureSubmissionSchema.parse({
      message: "  Faster exports please  ",
      sourceChannel: "manual",
      type: "idea",
      consentStatus: "granted",
      reporterName: "  Ada  ",
      reporterEmail: "  ada@example.com  ",
      segment: "  Enterprise  ",
      theme: "  Reporting  ",
    });

    expect(parsed).toMatchObject({
      message: "Faster exports please",
      reporterName: "Ada",
      reporterEmail: "ada@example.com",
      segment: "Enterprise",
      theme: "Reporting",
    });
  });
});
