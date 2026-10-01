import {
  meetingsListMeetingsResponseSchema,
  meetingsCreateMeetingResponseSchema,
  meetingsGetMeetingResponseSchema,
  meetingsAddAttendeeResponseSchema,
  actionItemsConvertToTaskResponseSchema,
} from "@/contracts/build-contracts.generated";

export const meetingRowContract = meetingsCreateMeetingResponseSchema;

export const meetingPageContract = meetingsListMeetingsResponseSchema;

export const meetingListItemContract = meetingsListMeetingsResponseSchema.shape.data.element;

export const actionItemRowContract = meetingsGetMeetingResponseSchema.shape.actionItems.element;

export const standupEntryContract = meetingsGetMeetingResponseSchema.shape.standupEntries.element;

export const meetingDetailAttendeeContract = meetingsGetMeetingResponseSchema.shape.attendees.element.extend({
  userId: meetingsAddAttendeeResponseSchema.shape.userId.optional().default(""),
});

export const meetingDetailContract = meetingsGetMeetingResponseSchema.extend({
  attendees: meetingDetailAttendeeContract.array(),
});

export const addAttendeeResultContract = meetingsAddAttendeeResponseSchema;

export const convertToTaskResultContract = actionItemsConvertToTaskResponseSchema;
