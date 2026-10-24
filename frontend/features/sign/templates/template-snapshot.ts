import type { SignDocument, SignEnvelope, SignField, SignRecipient } from "@/types/sign";

export function snapshotFromEnvelope(input: {
  envelope: SignEnvelope;
  documents: SignDocument[];
  recipients: SignRecipient[];
  fields: SignField[];
}): Record<string, unknown> {
  const documentIndexById = new Map(input.documents.map((document, index) => [document.id, index]));
  const roleByRecipientId = new Map(input.recipients.map((recipient) => [recipient.id, recipient.roleName]));

  return {
    subject: input.envelope.subject ?? undefined,
    message: input.envelope.message ?? undefined,
    routingMode: input.envelope.routingMode,
    ccTiming: input.envelope.ccTiming,
    allowDecline: input.envelope.allowDecline,
    expirationDays: 30,
    reminderEnabled: input.envelope.reminderEnabled,
    reminderFirstAfterDays: input.envelope.reminderFirstAfterDays,
    reminderRepeatDays: input.envelope.reminderRepeatDays,
    reminderMaxCount: input.envelope.reminderMaxCount,
    watermarkPolicyId: input.envelope.watermarkPolicyId,
    roles: input.recipients.map((recipient) => ({
      roleName: recipient.roleName,
      recipientType: recipient.recipientType,
      routingOrder: recipient.routingOrder,
      authMethod: recipient.authMethod,
    })),
    documents: input.documents.map((document) => ({
      fileKey: document.currentFileKey,
      fileName: document.fileName,
      mimeType: document.mimeType,
      pageCount: document.pageCount,
      fileSize: document.fileSize,
      sha256Hash: document.sha256Hash,
      orderIndex: document.orderIndex,
    })),
    fields: input.fields.flatMap((field) => {
      const roleName = roleByRecipientId.get(field.recipientId);
      const documentIndex = documentIndexById.get(field.documentId);
      if (!roleName || documentIndex === undefined) return [];
      return [
        {
          roleName,
          documentIndex,
          fieldType: field.fieldType,
          label: field.label,
          pageNumber: field.pageNumber,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          required: field.required,
          readonly: field.readonly,
          orderIndex: field.orderIndex,
          groupId: field.groupId,
          defaultValue: field.defaultValue,
          optionsJson: field.optionsJson,
          validationType: field.validationType,
          validationRulesJson: field.validationRulesJson,
          conditionalRulesJson: field.conditionalRulesJson,
        },
      ];
    }),
  };
}
