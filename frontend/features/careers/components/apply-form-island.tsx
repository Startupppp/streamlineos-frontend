"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { lazyContract, getApiErrorCode } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { ApplyScreeningFields, type ScreeningQuestion } from "./apply-screening-fields";
import { ApplySubmittedPanel, type SubmittedApplication } from "./apply-submitted-panel";
import {
  buildApplySchema,
  emptyApplyValues,
  toFormData,
  RESUME_ACCEPT,
  type ApplyFormValues,
} from "./apply-form-schema";

const publicJobApplicationContract = lazyContract(() =>
  import("@/lib/public-schema").then((m) => m.publicJobApplicationContract),
);

interface Props {
  orgSlug: string;
  orgName: string;
  jobId: number;
  jobTitle: string;
  questions: readonly ScreeningQuestion[];
}

/**
 * The public apply form.
 *
 * Consent is a required checkbox rather than something implied by pressing
 * Submit, the screening questions come from the job itself, and the résumé is a
 * real file posted as `multipart/form-data` — the endpoint reads all three, and
 * refuses the application outright without the first.
 */
export function ApplyFormIsland({ orgSlug, orgName, jobId, jobTitle, questions }: Props) {
  const [failure, setFailure] = useState<string | null>(null);
  const [knockedOut, setKnockedOut] = useState(false);
  const [result, setResult] = useState<SubmittedApplication | null>(null);

  const schema = useMemo(() => buildApplySchema(questions), [questions]);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyApplyValues(),
  });

  const phone = watch("phone");
  const consent = watch("consent");
  const resume = watch("resume");
  const answers = watch("answers");

  const handlePhoneChange = useCallback(
    (value: string) => setValue("phone", value, { shouldValidate: true }),
    [setValue],
  );
  const handleResumeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue("resume", event.target.files?.[0] ?? null, { shouldValidate: true }),
    [setValue],
  );
  const handleConsentChange = useCallback(
    (checked: boolean | "indeterminate") =>
      setValue("consent", checked === true, { shouldValidate: true }),
    [setValue],
  );
  const handleAnswerChange = useCallback(
    (questionId: string, value: string) =>
      setValue(`answers.${questionId}`, value, { shouldValidate: true }),
    [setValue],
  );

  const answerErrors = useMemo(() => {
    const found: Record<string, string | undefined> = {};
    for (const question of questions)
      found[question.id] = errors.answers?.[question.id]?.message;
    return found;
  }, [errors.answers, questions]);

  const onSubmit = useCallback(
    async (values: ApplyFormValues) => {
      setFailure(null);
      setKnockedOut(false);
      try {
        setResult(
          await apiClient.upload<SubmittedApplication>(
            `/public/careers/${orgSlug}/jobs/${jobId}/apply`,
            toFormData(values, questions),
            publicJobApplicationContract,
          ),
        );
      } catch (e) {
        setKnockedOut(getApiErrorCode(e) === "SCREENING_KNOCKOUT");
        setFailure(getErrorMessage(e) || "Unable to submit your application. Try again.");
      }
    },
    [orgSlug, jobId, questions],
  );

  if (result) return <ApplySubmittedPanel result={result} orgSlug={orgSlug} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply for {jobTitle}</CardTitle>
        <CardDescription>Fill in your details to submit your application.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="apply-name">
              Full name<span className="text-destructive"> *</span>
            </Label>
            <Input id="apply-name" autoComplete="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-email">
              Email address<span className="text-destructive"> *</span>
            </Label>
            <Input id="apply-email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-phone">Phone number</Label>
            <PhoneInput
              id="apply-phone"
              value={phone}
              onChange={handlePhoneChange}
              defaultCountry="IN"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-linkedin">LinkedIn profile</Label>
            <Input
              id="apply-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              {...register("linkedinUrl")}
            />
            {errors.linkedinUrl && (
              <p className="text-xs text-destructive">{errors.linkedinUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-resume">Résumé</Label>
            <Input
              id="apply-resume"
              type="file"
              accept={RESUME_ACCEPT}
              onChange={handleResumeChange}
            />
            <p className="text-xs text-muted-foreground">
              {resume ? resume.name : "PDF, DOC or DOCX, up to 10MB."}
            </p>
            {errors.resume && <p className="text-xs text-destructive">{errors.resume.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apply-cover">Cover letter</Label>
            <Textarea
              id="apply-cover"
              rows={5}
              placeholder="Tell us why you are a great fit for this role…"
              {...register("coverLetter")}
            />
            {errors.coverLetter && (
              <p className="text-xs text-destructive">{errors.coverLetter.message}</p>
            )}
          </div>

          <ApplyScreeningFields
            questions={questions}
            answers={answers}
            errors={answerErrors}
            onChange={handleAnswerChange}
            disabled={isSubmitting}
          />

          <div className="space-y-1.5">
            <div className="flex items-start gap-2.5 rounded-lg border px-4 py-3">
              <Checkbox
                id="apply-consent"
                checked={consent}
                onCheckedChange={handleConsentChange}
                className="mt-0.5"
              />
              <Label htmlFor="apply-consent" className="text-sm font-normal leading-snug">
                I consent to {orgName} storing and processing the details and files I submit here so
                they can consider me for this role.
                <span className="text-destructive"> *</span>
              </Label>
            </div>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent.message}</p>}
          </div>

          {failure && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
            >
              <p className="text-sm font-medium text-destructive">
                {knockedOut
                  ? "This role has a requirement your answer does not meet"
                  : "Your application was not submitted"}
              </p>
              <p className="text-sm text-destructive mt-0.5">{failure}</p>
            </div>
          )}

          <LoadingButton
            type="submit"
            className="w-full"
            isPending={isSubmitting}
            loadingText="Submitting…"
          >
            Submit application
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
