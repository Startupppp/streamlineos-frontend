"use client";

import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  TYPE_LABELS,
} from "@/features/build/feedbucket/feedbucket-constants";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type {
  FeedbucketConsentStatus,
  FeedbucketSentiment,
  FeedbucketSourceChannel,
  FeedbucketSubmissionStatus,
  FeedbucketSubmissionType,
} from "@/types/feedbucket";
import {
  CHANNEL_TONE,
  CONSENT_LABELS,
  CONSENT_TONE,
  SENTIMENT_LABELS,
  SENTIMENT_TONE,
  STATUS_TONE,
  TYPE_TONE,
  channelLabel,
  frequencyLabel,
  frequencyTone,
  submissionFrequency,
} from "../product-feedback-model";

interface ToneBadgeProps {
  tone: StatusTone;
  children: string;
  className?: string;
}

export function ToneBadge({ tone, children, className }: ToneBadgeProps) {
  const classes = statusToneClasses(tone);
  return (
    <Badge
      variant="outline"
      className={cn("h-5 py-0 text-micro", classes.surface, classes.ink, classes.rule, className)}
    >
      {children}
    </Badge>
  );
}

export function ChannelBadge({ channel }: { channel: FeedbucketSourceChannel | null | undefined }) {
  const label = channelLabel(channel);
  if (!label || !channel) return null;
  return <ToneBadge tone={CHANNEL_TONE[channel] ?? "neutral"}>{label}</ToneBadge>;
}

export function SentimentBadge({ sentiment }: { sentiment: FeedbucketSentiment | null | undefined }) {
  if (!sentiment) return null;
  return <ToneBadge tone={SENTIMENT_TONE[sentiment]}>{SENTIMENT_LABELS[sentiment]}</ToneBadge>;
}

export function FrequencyBadge({ duplicateCount }: { duplicateCount: number | null | undefined }) {
  const frequency = submissionFrequency(duplicateCount);
  return <ToneBadge tone={frequencyTone(frequency)}>{frequencyLabel(frequency)}</ToneBadge>;
}

export function ConsentBadge({ status }: { status: FeedbucketConsentStatus | null | undefined }) {
  if (!status) return null;
  return <ToneBadge tone={CONSENT_TONE[status]}>{CONSENT_LABELS[status]}</ToneBadge>;
}

export function TypeBadge({ type }: { type: FeedbucketSubmissionType | null | undefined }) {
  if (!type) return null;
  return <ToneBadge tone={TYPE_TONE[type]}>{TYPE_LABELS[type]}</ToneBadge>;
}

export function StatusBadge({ status }: { status: FeedbucketSubmissionStatus | null | undefined }) {
  if (!status) return null;
  return <ToneBadge tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</ToneBadge>;
}

export function ThemeBadge({ theme }: { theme: string | null | undefined }) {
  if (!theme) return null;
  return <ToneBadge tone="neutral">{theme}</ToneBadge>;
}

export function SegmentBadge({ segment }: { segment: string | null | undefined }) {
  if (!segment) return null;
  return <ToneBadge tone="neutral">{segment}</ToneBadge>;
}
