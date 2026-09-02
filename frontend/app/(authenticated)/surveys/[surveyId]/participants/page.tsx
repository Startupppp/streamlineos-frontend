import { SurveyParticipantsPage } from "@/features/surveys/participants/survey-participants-page";

export default async function Page({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  return <SurveyParticipantsPage surveyId={surveyId} />;
}
