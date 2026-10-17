import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

export interface PublicFailure {
  readonly kind: "dead-link" | "rate-limited" | "rejected" | "retryable";
  readonly title: string;
  readonly description: string;
  readonly retryable: boolean;
}

const DEAD_LINK_READ: PublicFailure = {
  kind: "dead-link",
  title: "This form is no longer available",
  description:
    "The link is either invalid or the form has been closed. Ask the team you are working with for an up-to-date link.",
  retryable: false,
};

const DEAD_LINK_SUBMIT: PublicFailure = {
  kind: "dead-link",
  title: "This form is no longer accepting responses",
  description:
    "The link is either invalid or the form has been closed, so your answers were not recorded. Ask the team you are working with for an up-to-date link.",
  retryable: false,
};

const DEAD_LINK_INTAKE: PublicFailure = {
  kind: "dead-link",
  title: "This link is not accepting requests",
  description:
    "The link is either invalid or request intake has been closed for this project, so your request was not recorded. Ask the team you are working with for an up-to-date link.",
  retryable: false,
};

function statusOf(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}

function codeOf(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

function rateLimited(error: unknown): PublicFailure {
  return {
    kind: "rate-limited",
    title: "Too many attempts",
    description: getErrorMessage(error),
    retryable: true,
  };
}

function rejected(error: unknown, title: string): PublicFailure {
  return {
    kind: "rejected",
    title,
    description: getErrorMessage(error),
    retryable: false,
  };
}

function retryable(error: unknown, title: string): PublicFailure {
  return {
    kind: "retryable",
    title,
    description: getErrorMessage(error),
    retryable: true,
  };
}

export function isMissingPublishedForm(error: unknown): boolean {
  return statusOf(error) === 404;
}

export function classifyPublicReadFailure(error: unknown): PublicFailure {
  const status = statusOf(error);
  if (status === 404) return DEAD_LINK_READ;
  if (status === 429) return rateLimited(error);
  return retryable(error, "We couldn't load this form");
}

export function classifyPublicFormSubmitFailure(error: unknown): PublicFailure {
  const status = statusOf(error);
  if (status === 404) return DEAD_LINK_SUBMIT;
  if (status === 429) return rateLimited(error);
  if (status === 400 || status === 422)
    return rejected(error, "Your answers were not accepted");
  return retryable(error, "We couldn't send your answers");
}

export function classifyIntakeSubmitFailure(error: unknown): PublicFailure {
  const status = statusOf(error);
  if (status === 429) return rateLimited(error);
  if (status === 422) return rejected(error, "Your request was not accepted");
  if (status === 400 && codeOf(error) === "VALIDATION_FAILED")
    return rejected(error, "Your request was not accepted");
  if (status === 400 || status === 404) return DEAD_LINK_INTAKE;
  return retryable(error, "We couldn't send your request");
}
