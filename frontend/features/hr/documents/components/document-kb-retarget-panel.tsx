"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ErrorReference } from "@/components/shared/error-reference";
import { HrSheet } from "@/components/shared/hr-sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useCan } from "@/hooks/api/access";
import { useRetargetDocumentKbLink, type DocumentKbLinkState } from "@/hooks/api/hr/document-kb-link";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  buildRetargetBody,
  formValuesFromLink,
  retargetFormSchema,
  type RetargetFormValues,
} from "./document-kb-retarget-schema";
import { DocumentKbRetargetFormFields } from "./document-kb-retarget-form-fields";

interface DocumentKbRetargetPanelProps {
  documentId: number;
  link: NonNullable<DocumentKbLinkState["link"]>;
  documentName: string;
}

export function DocumentKbRetargetPanel({ documentId, link, documentName }: DocumentKbRetargetPanelProps) {
  const canPublish = useCan("hr:documents:publish");
  const retarget = useRetargetDocumentKbLink();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const form = useForm<RetargetFormValues>({
    resolver: zodResolver(retargetFormSchema),
    defaultValues: formValuesFromLink(link),
  });

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      form.reset(formValuesFromLink(link));
      setFailure(null);
    }
    prevOpenRef.current = open;
  }, [open, link, form]);

  const handleOpen = useCallback(() => setOpen(true), []);

  const handleOpenChange = useCallback((next: boolean) => setOpen(next), []);

  const handleDiscard = useCallback(() => {
    form.reset(formValuesFromLink(link));
    setFailure(null);
  }, [form, link]);

  const handleSubmit = useCallback(
    () =>
      form.handleSubmit(async (values) => {
        const body = buildRetargetBody(values, link);
        if (Object.keys(body).length === 0) return;
        setFailure(null);
        try {
          await retarget.mutateAsync({ documentId, ...body });
          toast.success(`"${documentName}" settings were updated.`);
          setOpen(false);
        } catch (error) {
          setFailure(error);
          toast.error(getErrorMessage(error));
        }
      })(),
    [documentId, documentName, form, link, retarget],
  );

  if (!canPublish) return null;

  return (
    <>
      <Button type="button" variant="outline" onClick={handleOpen}>
        Change settings
      </Button>

      <HrSheet
        open={open}
        onOpenChange={handleOpenChange}
        title="Change Knowledge Base settings"
        description={`Update the audience and version for "${documentName}".`}
        submitLabel="Save settings"
        submitDisabled={!form.formState.isDirty}
        isPending={retarget.isPending}
        isDirty={form.formState.isDirty}
        onDiscard={handleDiscard}
        onSubmit={handleSubmit}
      >
        <Form {...form}>
          <div className="flex flex-col gap-4">
            {failure !== null ? (
              <Alert variant="destructive">
                <AlertTitle>Not done</AlertTitle>
                <AlertDescription>
                  <p>{getErrorMessage(failure)}</p>
                  <ErrorReference error={failure} className="mt-2 justify-start" />
                </AlertDescription>
              </Alert>
            ) : null}
            <DocumentKbRetargetFormFields />
          </div>
        </Form>
      </HrSheet>
    </>
  );
}
