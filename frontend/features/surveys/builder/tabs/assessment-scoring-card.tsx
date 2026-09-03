"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePatchSurvey, type SurveyForm } from "@/hooks/api/surveys/forms";
import { numericFieldChangeOr } from "@/lib/numeric-field";

interface AssessmentSettings {
  passScore?: number;
  attemptsAllowed?: number;
  timeLimitMinutes?: number;
  certificateOnPass?: boolean;
}

export function AssessmentScoringCard({ survey }: { survey: SurveyForm }) {
  const patchSurvey = usePatchSurvey(survey.id);
  const existing = (survey.settings as AssessmentSettings | undefined) ?? {};

  const [passScore, setPassScore] = useState(existing.passScore ?? 0);
  const [attemptsAllowed, setAttemptsAllowed] = useState(existing.attemptsAllowed ?? 0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(existing.timeLimitMinutes ?? 0);
  const [certificateOnPass, setCertificateOnPass] = useState(existing.certificateOnPass ?? false);

  async function handleSave() {
    try {
      await patchSurvey.mutateAsync({
        settings: {
          ...survey.settings,
          passScore,
          attemptsAllowed: attemptsAllowed || undefined,
          timeLimitMinutes: timeLimitMinutes || undefined,
          certificateOnPass,
        },
      });
      toast.success("Assessment settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Time & Scoring</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="space-y-1.5">
            <Label>Pass score</Label>
            <Input type="number" value={passScore} onChange={numericFieldChangeOr(setPassScore, 0)} className="w-28" />
          </div>
          <div className="space-y-1.5">
            <Label>Attempts allowed</Label>
            <Input
              type="number"
              value={attemptsAllowed || ""}
              onChange={numericFieldChangeOr(setAttemptsAllowed, 0)}
              placeholder="Unlimited"
              className="w-28"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time limit (min)</Label>
            <Input
              type="number"
              value={timeLimitMinutes || ""}
              onChange={numericFieldChangeOr(setTimeLimitMinutes, 0)}
              placeholder="None"
              className="w-28"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="certificate-on-pass">Issue certificate on pass</Label>
          <Switch id="certificate-on-pass" checked={certificateOnPass} onCheckedChange={setCertificateOnPass} />
        </div>
        <Button size="sm" onClick={handleSave} disabled={patchSurvey.isPending}>Save</Button>
      </CardContent>
    </Card>
  );
}
