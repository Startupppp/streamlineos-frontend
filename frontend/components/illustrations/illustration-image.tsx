import { cn } from "@/lib/utils";

export type IllustrationName =
  | "empty-inbox"
  | "empty-projects"
  | "empty-team"
  | "empty-tasks"
  | "empty-documents"
  | "empty-time"
  | "empty-expenses"
  | "empty-devices"
  | "empty-search"
  | "empty-activity"
  | "empty-calendar"
  | "empty-sprint"
  | "empty-mail"
  | "empty-person"
  | "empty-wfh"
  | "empty-approval"
  | "not-found"
  | "empty-target"
  | "empty-leaderboard"
  | "empty-leave"
  | "empty-ticket"
  | "empty-public-docs"
  | "empty-upload"
  | "empty-products"
  | "empty-warehouse"
  | "empty-orders"
  | "empty-transfer"
  | "empty-report"
  | "empty-knowledge"
  | "empty-leads"
  | "empty-deals"
  | "empty-companies"
  | "empty-clients"
  | "empty-payroll"
  | "authentication"
  | "forgot-password"
  | "onboarding"
  | "welcome"
  | "survey"
  | "survey-complete"
  | "chat"
  | "server-error"
  | "connection-lost"
  | "security"
  | "settings"
  | "setup-wizard"
  | "learning"
  | "travel"
  | "ai"
  | "invitation"
  | "automations";

export interface IllustrationProps {
  className?: string;
  alt?: string;
}

export function IllustrationImage({
  name,
  className,
  alt = "",
}: IllustrationProps & { name: IllustrationName }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/illustrations/${name}.svg`}
      alt={alt}
      className={cn("h-full w-full object-contain", className)}
      aria-hidden={alt.length === 0}
      draggable={false}
    />
  );
}

function createIllustration(name: IllustrationName) {
  return function Illustration({ className, alt }: IllustrationProps = {}) {
    return <IllustrationImage name={name} className={className} alt={alt} />;
  };
}

export const EmptyInboxIllustration = createIllustration("empty-inbox");
export const EmptyProjectsIllustration = createIllustration("empty-projects");
export const EmptyTeamIllustration = createIllustration("empty-team");
export const EmptyTasksIllustration = createIllustration("empty-tasks");
export const EmptyDocumentsIllustration = createIllustration("empty-documents");
export const EmptyTimeIllustration = createIllustration("empty-time");
export const EmptyExpensesIllustration = createIllustration("empty-expenses");
export const EmptyDevicesIllustration = createIllustration("empty-devices");
export const EmptySearchIllustration = createIllustration("empty-search");
export const EmptyActivityIllustration = createIllustration("empty-activity");
export const EmptyCalendarIllustration = createIllustration("empty-calendar");
export const EmptySprintIllustration = createIllustration("empty-sprint");
export const EmptyMailIllustration = createIllustration("empty-mail");
export const EmptyPersonIllustration = createIllustration("empty-person");
export const EmptyWfhIllustration = createIllustration("empty-wfh");
export const EmptyApprovalIllustration = createIllustration("empty-approval");
export const NotFoundIllustration = createIllustration("not-found");
export const EmptyTargetIllustration = createIllustration("empty-target");
export const EmptyLeaderboardIllustration = createIllustration("empty-leaderboard");
export const EmptyLeaveIllustration = createIllustration("empty-leave");
export const EmptyTicketIllustration = createIllustration("empty-ticket");
export const EmptyPublicDocsIllustration = createIllustration("empty-public-docs");
export const EmptyUploadIllustration = createIllustration("empty-upload");
export const EmptyProductsIllustration = createIllustration("empty-products");
export const EmptyWarehouseIllustration = createIllustration("empty-warehouse");
export const EmptyOrdersIllustration = createIllustration("empty-orders");
export const EmptyTransferIllustration = createIllustration("empty-transfer");
export const EmptyReportIllustration = createIllustration("empty-report");
export const EmptyKnowledgeIllustration = createIllustration("empty-knowledge");
export const EmptyLeadsIllustration = createIllustration("empty-leads");
export const EmptyDealsIllustration = createIllustration("empty-deals");
export const EmptyCompaniesIllustration = createIllustration("empty-companies");
export const EmptyClientsIllustration = createIllustration("empty-clients");
export const EmptyPayroll = createIllustration("empty-payroll");

export const AuthenticationIllustration = createIllustration("authentication");
export const ForgotPasswordIllustration = createIllustration("forgot-password");
export const OnboardingIllustration = createIllustration("onboarding");
export const WelcomeIllustration = createIllustration("welcome");
export const SurveyIllustration = createIllustration("survey");
export const SurveyCompleteIllustration = createIllustration("survey-complete");
export const ChatIllustration = createIllustration("chat");
export const ServerErrorIllustration = createIllustration("server-error");
export const ConnectionLostIllustration = createIllustration("connection-lost");
export const SecurityIllustration = createIllustration("security");
export const SettingsIllustration = createIllustration("settings");
export const SetupWizardIllustration = createIllustration("setup-wizard");
export const LearningIllustration = createIllustration("learning");
export const TravelIllustration = createIllustration("travel");
export const AiIllustration = createIllustration("ai");
export const InvitationIllustration = createIllustration("invitation");
export const AutomationsIllustration = createIllustration("automations");
