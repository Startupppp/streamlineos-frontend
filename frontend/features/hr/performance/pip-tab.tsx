"use client";

import { useState, useCallback, useMemo, type ChangeEvent } from "react";
import {
  usePIPs,
  useCreatePIP,
  useUpdatePIP,
  useHrEmployees,
  unwrapEmployees,
  type PIP,
} from "@/hooks/api/hr";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyApprovalIllustration } from "@/components/illustrations";
import { HrSheet } from "@/components/shared/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { Plus } from "lucide-react";
import { buildPipSchema } from "./pip-schema";
import { zodFieldErrors } from "./zod-field-errors";
import { PipFormFields } from "./pip-form-fields";
import { PipCard } from "./pip-card";

export function PIPTab() {
  const { data: pips, isLoading, isError, error, refetch } = usePIPs();
  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const createPIP = useCreatePIP();
  const updatePIP = useUpdatePIP();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPip, setEditingPip] = useState<PIP | null>(null);
  const [pipUserId, setPipUserId] = useState("");
  const [hrRepPickerOpen, setHrRepPickerOpen] = useState(false);
  const [hrRepId, setHrRepId] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [managerRating, setManagerRating] = useState("");
  const [objectives, setObjectives] = useState([
    { objective: "", metric: "", deadline: "" },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const employees = useMemo(
    () => unwrapEmployees(employeesRaw).filter((e) => !!e.id),
    [employeesRaw],
  );

  const hrEmployees = useMemo(
    () => employees.filter((e) => e.isActive && e.role === "HR"),
    [employees],
  );

  const pipsList = useMemo(
    () => (Array.isArray(pips) ? pips : []) as PIP[],
    [pips],
  );

  const resetForm = useCallback(() => {
    setPipUserId("");
    setHrRepId("");
    setReason("");
    setStartDate("");
    setEndDate("");
    setNotes("");
    setManagerRating("");
    setObjectives([{ objective: "", metric: "", deadline: "" }]);
    setEditingPip(null);
    setFieldErrors({});
  }, []);

  const handleManagerRatingChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        setManagerRating("");
        return;
      }
      const n = Math.min(5, Math.max(1, Math.round(Number(raw))));
      setManagerRating(String(n));
    },
    [],
  );

  const handleOpenEdit = useCallback((pip: PIP) => {
    setEditingPip(pip);
    setPipUserId(pip.userId);
    setHrRepId(pip.hrRepId ?? "");
    setReason(pip.reason);
    setStartDate(pip.startDate);
    setEndDate(pip.endDate);
    setNotes(pip.notes ?? "");
    setManagerRating("");
    setObjectives(
      pip.objectives && pip.objectives.length > 0
        ? pip.objectives
        : [{ objective: "", metric: "", deadline: "" }],
    );
    setFieldErrors({});
    setSheetOpen(true);
  }, []);

  const handleSubmit = useCallback(() => {
    const completeObjectives = objectives.filter(
      (o) => o.objective.trim() && o.metric.trim() && o.deadline,
    );
    const schema = buildPipSchema({ enforceFutureStart: !editingPip });
    const parsed = schema.safeParse({
      userId: pipUserId,
      hrRepId,
      reason,
      startDate,
      endDate,
      notes,
      objectives:
        completeObjectives.length > 0
          ? completeObjectives
          : [{ objective: "", metric: "", deadline: "" }],
    });
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    const data = parsed.data;
    const payload = {
      reason: data.reason,
      objectives: data.objectives.map((o) => ({
        objective: o.objective,
        metric: o.metric,
        deadline: o.deadline,
      })),
      endDate: data.endDate,
      notes: data.notes || undefined,
      hrRepId: data.hrRepId || undefined,
    };

    if (editingPip) {
      updatePIP.mutate(
        { pipId: editingPip.id, ...payload },
        {
          onSuccess: () => {
            toast.success("PIP updated");
            setSheetOpen(false);
            resetForm();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      const existingActive = pipsList.find(
        (p) =>
          p.userId === pipUserId &&
          (p.status === "ACTIVE" || p.status === "EXTENDED"),
      );
      if (existingActive) {
        setFieldErrors({ userId: "This employee already has an active PIP" });
        return;
      }

      createPIP.mutate(
        { userId: data.userId, startDate: data.startDate, ...payload },
        {
          onSuccess: () => {
            toast.success("PIP created");
            setSheetOpen(false);
            resetForm();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    }
  }, [
    pipUserId,
    hrRepId,
    reason,
    startDate,
    endDate,
    notes,
    objectives,
    pipsList,
    editingPip,
    createPIP,
    updatePIP,
    resetForm,
  ]);

  const handleUpdateStatus = useCallback(
    (id: number, status: string) => {
      updatePIP.mutate(
        { pipId: id, status },
        {
          onSuccess: () => toast.success("PIP updated"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [updatePIP],
  );

  const addObjective = useCallback(() => {
    setObjectives((prev) => [
      ...prev,
      { objective: "", metric: "", deadline: "" },
    ]);
  }, []);

  const removeObjective = useCallback((index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateObjectiveField = useCallback(
    (
      index: number,
      field: "objective" | "metric" | "deadline",
      value: string,
    ) => {
      setObjectives((prev) =>
        prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)),
      );
    },
    [],
  );

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setSheetOpen(true);
  }, [resetForm]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetForm();
      setSheetOpen(open);
    },
    [resetForm],
  );

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value),
    [],
  );

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setEndDate((prev) => clearEndIfInvalid(value, prev, "after"));
  }, []);

  const handleEndDateChange = useCallback(
    (value: string) => setEndDate(value),
    [],
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value),
    [],
  );

  const handleSelectPipUser = useCallback((id: string) => {
    setPipUserId(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.userId;
      return next;
    });
  }, []);

  const handleSelectHrRep = useCallback((id: string) => {
    setHrRepId(id);
    setHrRepPickerOpen(false);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.hrRepId;
      return next;
    });
  }, []);

  const handlePipUserIdChange = useCallback((id: string) => {
    setPipUserId(id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.userId;
      return next;
    });
  }, []);

  const pipStartBounds = planningStartPickerProps({
    existingValue: editingPip ? startDate : undefined,
  });
  const pipEndBounds = planningEndPickerProps({
    startDate,
    mode: "after",
    existingValue: editingPip ? endDate : undefined,
  });
  const objectiveDeadlineBounds = planningEndPickerProps({
    startDate,
    mode: "after",
    existingValue: editingPip ? startDate : undefined,
  });

  if (isLoading) {
    return <LoadingState variant="list" rows={12} />;
  }

  if (isError) {
    return <ErrorState className="flex-1" title="Couldn't load PIPs" description={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-sm text-muted-foreground">
          {pipsList.length} performance improvement plans
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New PIP
        </Button>
      </div>

      {pipsList.length === 0 ? (
        <EmptyState
          illustration={<EmptyApprovalIllustration className="h-full w-full" />}
          title="No PIPs issued yet"
          description="Performance improvement plans help employees get back on track with clear objectives and timelines."
          action={{ label: "New PIP", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="space-y-2">
          {pipsList.map((pip) => (
            <PipCard
              key={pip.id}
              pip={pip}
              onOpenEdit={handleOpenEdit}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title={
          editingPip
            ? "Edit Performance Improvement Plan"
            : "Create Performance Improvement Plan"
        }
        onSubmit={handleSubmit}
        submitLabel={editingPip ? "Save Changes" : "Create PIP"}
        isPending={createPIP.isPending || updatePIP.isPending}
      >
        <PipFormFields
          hrEmployees={hrEmployees}
          pipUserId={pipUserId}
          editingUserName={editingPip?.user?.name ?? null}
          hrRepId={hrRepId}
          hrRepPickerOpen={hrRepPickerOpen}
          reason={reason}
          startDate={startDate}
          endDate={endDate}
          notes={notes}
          managerRating={managerRating}
          objectives={objectives}
          fieldErrors={fieldErrors}
          isEditing={!!editingPip}
          pipStartBounds={pipStartBounds}
          pipEndBounds={pipEndBounds}
          objectiveDeadlineBounds={objectiveDeadlineBounds}
          onHrRepPickerOpenChange={setHrRepPickerOpen}
          onSelectPipUser={handleSelectPipUser}
          onSelectHrRep={handleSelectHrRep}
          onReasonChange={handleReasonChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onNotesChange={handleNotesChange}
          onManagerRatingChange={handleManagerRatingChange}
          onAddObjective={addObjective}
          onRemoveObjective={removeObjective}
          onUpdateObjectiveField={updateObjectiveField}
        />
      </HrSheet>
    </div>
  );
}
