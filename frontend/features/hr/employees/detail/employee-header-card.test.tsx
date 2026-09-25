import { render, screen } from "@testing-library/react";
import { EmployeeHeaderCard } from "./employee-header-card";
import type { EmployeeData } from "./employee-data";

jest.mock("@/features/hr/employees/detail/employee-detail-helpers", () => ({
  AvailabilityBadge: () => null,
  InfoField: ({ label, value }: { label: string; value: unknown }) =>
    value ? (
      <div>
        {label}: {String(value)}
      </div>
    ) : null,
  StatBlock: ({ label, value }: { label: string; value: number }) => (
    <div>
      {label}: {value}
    </div>
  ),
}));

jest.mock("@/components/hr/resend-invite-button", () => ({
  ResendInviteButton: () => null,
}));
jest.mock("@/components/hr/copy-invite-link-button", () => ({
  CopyInviteLinkButton: () => null,
}));
jest.mock("@/features/hr/employees/detail/invite-delivery-badge", () => ({
  InviteDeliveryBadge: () => null,
  InviteDeliveryNote: () => null,
}));

function employee(overrides: Partial<EmployeeData> = {}): EmployeeData {
  return {
    id: "employee-user-1",
    name: null,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    role: "MEMBER",
    designation: "Engineer",
    employeeId: "EMP-1",
    orgDepartmentId: null,
    image: null,
    isActive: true,
    joiningDate: null,
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
    inviteDelivery: {
      status: "none",
      queuedAt: null,
      sentAt: null,
      attempts: 0,
      lastError: null,
      deliveryConfirmed: false,
    },
    ...overrides,
  };
}

function renderHeader(overrides: Partial<EmployeeData> = {}) {
  return render(
    <EmployeeHeaderCard
      employee={employee(overrides)}
      stats={null}
      statsLoading={false}
      isSelf={false}
      completeness={100}
      missingFields={[]}
      lifecycleStatus={null}
      employeeNumber={null}
      workerType={null}
      isAlreadyTerminated={false}
      showEmploymentActiveBadge
      showLegacyEmployeeId={false}
      legacyEmployeeId=""
    />,
  );
}

describe("EmployeeHeaderCard name", () => {
  it("shows the display name once when first name, last name and display name are all set", () => {
    renderHeader({
      name: "Ada B. Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
    });

    expect(screen.getAllByText("Ada B. Lovelace")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    // The composed first+last reading, which used to win here and to render a
    // second time as the page title above the card.
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("falls back to the display name when first and last are null", () => {
    renderHeader({
      name: "Grace Hopper",
      firstName: null,
      lastName: null,
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Grace Hopper",
    );
    expect(screen.queryByText("Employee")).not.toBeInTheDocument();
  });

  it("falls back to the email local part rather than the literal word Employee", () => {
    renderHeader({
      name: null,
      firstName: null,
      lastName: null,
      email: "owner@example.test",
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("owner");
  });
});

describe("EmployeeHeaderCard status badge", () => {
  it("badges an invited-but-not-accepted employee Pending, never Active", () => {
    renderHeader({ hasAccepted: false });

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  it("badges an accepted employee Active", () => {
    renderHeader({ hasAccepted: true });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Pending")).not.toBeInTheDocument();
  });
});
