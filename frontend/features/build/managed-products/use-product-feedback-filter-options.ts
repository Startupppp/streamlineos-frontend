"use client";

import { useManagedProductMembers } from "@/hooks/api/build/managed-product-members";
import { getUserDisplayName } from "@/lib/person-display";
import {
  STATUS_FILTER_OPTIONS,
  SOURCE_CHANNEL_FILTER_OPTIONS,
  SENTIMENT_FILTER_OPTIONS,
} from "./product-feedback-columns";
import { BUILD_FILTER_ALL } from "@/features/build/shared/use-build-list-filters";
import type { useProductFeedbackFilters } from "./use-product-feedback-filters";

const SOURCE_CHANNEL_OPTIONS_MULTI = SOURCE_CHANNEL_FILTER_OPTIONS.filter(
  (o) => o.value !== BUILD_FILTER_ALL,
);
const SENTIMENT_OPTIONS_MULTI = SENTIMENT_FILTER_OPTIONS.filter(
  (o) => o.value !== BUILD_FILTER_ALL,
);
const STATUS_OPTIONS_MULTI = STATUS_FILTER_OPTIONS.filter(
  (o) => o.value !== BUILD_FILTER_ALL,
);

export { SOURCE_CHANNEL_OPTIONS_MULTI, SENTIMENT_OPTIONS_MULTI, STATUS_OPTIONS_MULTI };

interface FacetsData {
  themes?: Array<{ value: string | null; count: number }>;
  segments?: Array<{ value: string | null; count: number }>;
}

interface CrmOrgsData {
  organizations?: Array<{ id: number; name: string }>;
}

export interface ActiveChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function useProductFeedbackFilterOptions(
  filterState: ReturnType<typeof useProductFeedbackFilters>,
  facetsData: FacetsData | undefined,
  crmOrgsData: CrmOrgsData | undefined,
) {
  const {
    managedProductId,
    appliedStatuses,
    appliedAssigneeIds,
    appliedSourceChannels,
    appliedThemes,
    appliedSentiments,
    appliedSegments,
    appliedCrmOrgIds,
    handleStatusValuesChange,
    handleAssigneeValuesChange,
    handleSourceChannelValuesChange,
    handleThemeValuesChange,
    handleSentimentValuesChange,
    handleSegmentValuesChange,
    handleCrmOrgValuesChange,
  } = filterState;

  const { data: membersData } = useManagedProductMembers(managedProductId);
  const memberOptions = (membersData?.data ?? []).flatMap((m) =>
    m.member ? [{ value: m.member.id, label: getUserDisplayName(m.member) }] : [],
  );

  const themeOptionsMulti = (() => {
    const opts = [
      { value: "untagged", label: "Untagged" },
      ...(facetsData?.themes ?? [])
        .filter((t): t is { value: string; count: number } => t.value !== null)
        .map((t) => ({ value: t.value, label: t.value })),
    ];
    for (const applied of appliedThemes ?? []) {
      if (applied !== "untagged" && !opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: applied });
      }
    }
    return opts;
  })();

  const segmentOptionsMulti = (() => {
    const opts = (facetsData?.segments ?? [])
      .filter((s): s is { value: string; count: number } => s.value !== null)
      .map((s) => ({ value: s.value, label: s.value }));
    for (const applied of appliedSegments ?? []) {
      if (!opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: applied });
      }
    }
    return opts;
  })();

  const customerOptionsMulti = (() => {
    const opts = (crmOrgsData?.organizations ?? []).map((o) => ({
      value: String(o.id),
      label: o.name,
    }));
    for (const applied of appliedCrmOrgIds ?? []) {
      if (!opts.some((o) => o.value === applied)) {
        opts.push({ value: applied, label: `Customer ${applied}` });
      }
    }
    return opts;
  })();

  const chips: ActiveChip[] = [];
  for (const st of appliedStatuses ?? []) {
    const label = STATUS_OPTIONS_MULTI.find((o) => o.value === st)?.label ?? st;
    chips.push({
      id: `status:${st}`,
      label: "Status",
      value: label,
      onRemove: () => handleStatusValuesChange((appliedStatuses ?? []).filter((v) => v !== st)),
    });
  }
  for (const uid of appliedAssigneeIds ?? []) {
    const opt = memberOptions.find((o) => o.value === uid);
    chips.push({
      id: `assignee:${uid}`,
      label: "Owner",
      value: opt?.label ?? uid,
      onRemove: () => handleAssigneeValuesChange((appliedAssigneeIds ?? []).filter((v) => v !== uid)),
    });
  }
  for (const ch of appliedSourceChannels ?? []) {
    const label = SOURCE_CHANNEL_OPTIONS_MULTI.find((o) => o.value === ch)?.label ?? ch;
    chips.push({
      id: `channel:${ch}`,
      label: "Channel",
      value: label,
      onRemove: () => handleSourceChannelValuesChange((appliedSourceChannels ?? []).filter((v) => v !== ch)),
    });
  }
  for (const th of appliedThemes ?? []) {
    chips.push({
      id: `theme:${th}`,
      label: "Theme",
      value: th,
      onRemove: () => handleThemeValuesChange((appliedThemes ?? []).filter((v) => v !== th)),
    });
  }
  for (const se of appliedSentiments ?? []) {
    const label = SENTIMENT_OPTIONS_MULTI.find((o) => o.value === se)?.label ?? se;
    chips.push({
      id: `sentiment:${se}`,
      label: "Sentiment",
      value: label,
      onRemove: () => handleSentimentValuesChange((appliedSentiments ?? []).filter((v) => v !== se)),
    });
  }
  for (const sg of appliedSegments ?? []) {
    chips.push({
      id: `segment:${sg}`,
      label: "Segment",
      value: sg,
      onRemove: () => handleSegmentValuesChange((appliedSegments ?? []).filter((v) => v !== sg)),
    });
  }
  for (const cid of appliedCrmOrgIds ?? []) {
    const label = customerOptionsMulti.find((o) => o.value === cid)?.label ?? `Customer ${cid}`;
    chips.push({
      id: `customer:${cid}`,
      label: "Customer",
      value: label,
      onRemove: () => handleCrmOrgValuesChange((appliedCrmOrgIds ?? []).filter((v) => v !== cid)),
    });
  }

  return {
    memberOptions,
    themeOptionsMulti,
    segmentOptionsMulti,
    customerOptionsMulti,
    chips,
  };
}
