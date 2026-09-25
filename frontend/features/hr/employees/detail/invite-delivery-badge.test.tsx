import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { backendPath } from "@/lib/test-support/backend-path";
import { employeeDataSchema } from "./employee-data";
import {
  InviteDeliveryBadge,
  type InviteDelivery,
} from "./invite-delivery-badge";

/**
 * HRMS-E2E-018. Nothing on this screen may assert a delivery state the server
 * never observed — that is the whole defect the ticket was raised for.
 */
const DELIVERY: InviteDelivery = {
  status: "queued",
  queuedAt: "2026-09-20T10:00:00.000Z",
  sentAt: null,
  attempts: 0,
  lastError: null,
  deliveryConfirmed: false,
};

describe("the employee detail contract carries invite delivery", () => {
  const BASE_EMPLOYEE = {
    id: "employee-user-1",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    role: "MEMBER",
    designation: "Engineer",
    employeeId: "EMP-1",
    orgDepartmentId: "department-1",
    image: null,
    isActive: true,
    joiningDate: "2026-08-01",
    reportingTo: null,
    bio: null,
    linkedinUrl: null,
    twitterUrl: null,
    githubUrl: null,
    websiteUrl: null,
    skills: [],
    phone: null,
    employmentStatus: "ACTIVE",
    employment: null,
    inviteDelivery: DELIVERY,
  };

  it("parses the delivery block the backend now returns, instead of rejecting it as an unknown key", () => {
    const parsed = employeeDataSchema.safeParse(BASE_EMPLOYEE);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it("refuses a status the server cannot observe, so the screen can never be handed one", () => {
    for (const status of ["delivered", "bounced"]) {
      expect(
        employeeDataSchema.safeParse({
          ...BASE_EMPLOYEE,
          inviteDelivery: { ...DELIVERY, status },
        }).success,
      ).toBe(false);
    }
  });

  it("models exactly the states the backend declares, because a state only one side knows is a state the screen would invent", () => {
    const source = readFileSync(
      backendPath("src/modules/hr/directory/employee-invite-delivery.ts"),
      "utf8",
    );
    const block = /export const INVITE_DELIVERY_STATUSES = \[([\s\S]*?)\] as const;/.exec(
      source,
    );
    expect(block).not.toBeNull();

    const backendStates = [...(block?.[1] ?? "").matchAll(/"([a-z]+)"/g)].map(
      (m) => m[1],
    );
    expect(backendStates.length).toBeGreaterThan(0);

    const badgeSource = readFileSync(
      resolve(
        process.cwd(),
        "features/hr/employees/detail/invite-delivery-badge.tsx",
      ),
      "utf8",
    );
    const presentation =
      /const INVITE_DELIVERY_PRESENTATION[\s\S]*?\n\} as const;/.exec(
        badgeSource,
      );
    expect(presentation).not.toBeNull();

    const frontendStates = [
      ...(presentation?.[0] ?? "").matchAll(/^ {2}([a-z]+): \{/gm),
    ].map((m) => m[1]);

    expect([...backendStates].sort()).toEqual([...frontendStates].sort());
  });
});

describe("invite delivery badge says only what the server observed", () => {
  it("renders nothing at all when no invite email was ever written", () => {
    const { container } = render(
      <InviteDeliveryBadge delivery={{ ...DELIVERY, status: "none" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("says queued, not sent, while the message is still in the outbox", () => {
    render(<InviteDeliveryBadge delivery={{ ...DELIVERY, status: "queued" }} />);
    expect(screen.getByText("Invite queued")).toBeInTheDocument();
    expect(screen.queryByText(/delivered/i)).not.toBeInTheDocument();
  });

  it("says the provider accepted it, and never that it arrived", () => {
    render(
      <InviteDeliveryBadge
        delivery={{
          ...DELIVERY,
          status: "sent",
          sentAt: "2026-09-20T10:00:04.000Z",
        }}
      />,
    );
    expect(screen.getByText("Invite sent")).toBeInTheDocument();
    expect(screen.queryByText(/delivered/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bounced/i)).not.toBeInTheDocument();
    expect(
      screen.getByTitle(
        "Accepted by the email provider. Delivery to the inbox is not confirmed.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the provider's own reason on a failure, so an administrator knows to hand over a link instead", () => {
    render(
      <InviteDeliveryBadge
        delivery={{
          ...DELIVERY,
          status: "failed",
          attempts: 1,
          lastError: "No email provider configured",
        }}
      />,
    );
    expect(screen.getByText("Invite failed")).toBeInTheDocument();
    expect(
      screen.getByTitle(/No email provider configured/),
    ).toBeInTheDocument();
  });

  it("distinguishes a withheld send from a failed one", () => {
    render(
      <InviteDeliveryBadge delivery={{ ...DELIVERY, status: "suppressed" }} />,
    );
    expect(screen.getByText("Invite withheld")).toBeInTheDocument();
  });
});
