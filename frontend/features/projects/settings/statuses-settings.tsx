"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Columns3 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanManageProject } from "@/hooks/api/projects/use-can-manage-project";
import { useCustomStates, useCreateCustomState } from "@/hooks/api/projects/custom-states";
import { ColumnColorPicker } from "@/features/projects/shared/column-color-picker";
import { DEFAULT_COLUMN_COLOR } from "@/features/projects/shared/column-colors";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import {
  StatusRow,
  STATE_TYPE_KEYS,
  TYPE_CONFIG,
  type StateType,
} from "./status-row";

const MAX_NAME = 50;

function validateNewName(name: string, existingNames: string[]): string | null {
  if (!name) return "Name is required";
  if (!/[a-zA-Z0-9]/.test(name)) {
    return "Name must contain at least one letter or number";
  }
  if (name.length > MAX_NAME) {
    return `Name must be ${MAX_NAME} characters or fewer`;
  }
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return "A status with this name already exists";
  }
  return null;
}

export function StatusesSettings({ projectId }: { projectId: number }) {
  const canManage = useCanManageProject(projectId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [type, setType] = useState<StateType>("unstarted");
  const [color, setColor] = useState<string>(DEFAULT_COLUMN_COLOR);

  const { data: states = [], isLoading } = useCustomStates(projectId);
  const createState = useCreateCustomState(projectId);
  const existingNames = states.map((s) => s.name);

  const handleShowForm = useCallback(() => {
    setShowForm(true);
    setNameError(null);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setName("");
    setNameError(null);
    setType("unstarted");
    setColor(DEFAULT_COLUMN_COLOR);
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      setNameError(null);
    },
    [],
  );

  const handleTypeChange = useCallback((value: string) => {
    const found = STATE_TYPE_KEYS.find((t) => t === value);
    if (found) setType(found);
  }, []);

  const handleColorChange = useCallback((next: string) => {
    setColor(next);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    const error = validateNewName(trimmed, existingNames);
    if (error) {
      setNameError(error);
      return;
    }
    createState.mutate(
      { name: trimmed, color, type },
      {
        onSuccess: () => {
          setName("");
          setNameError(null);
          setType("unstarted");
          setColor(DEFAULT_COLUMN_COLOR);
          setShowForm(false);
          toast.success("Status created");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [name, color, type, existingNames, createState]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
            Workflow Statuses
          </h3>
          <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
            Define custom workflow statuses for this project.
          </p>
        </div>
        {canManage && !showForm ? (
          <AnimatedIconButton
            variant="outline"
            size="sm"
            onClick={handleShowForm}
            className="h-7 shrink-0 text-xs gap-1.5"
            icon={PlusIcon}
            iconSize={14}
          >
            Add Status
          </AnimatedIconButton>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {states.length === 0 && !showForm ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 py-4 text-center"
              >
                <Columns3 className="w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No statuses configured
                </p>
                <p className="text-xs text-muted-foreground">
                  Add statuses to define your project workflow
                </p>
              </motion.div>
            ) : null}

            {states.map((state, idx) => (
              <StatusRow
                key={state.id}
                state={state}
                index={idx}
                canManage={canManage}
                existingNames={existingNames}
                projectId={projectId}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg border border-border bg-muted/30 space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="status-create-name">
                      Name
                    </label>
                    <Input
                      id="status-create-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="e.g. In Review"
                      className={cn(
                        nameError && "border-destructive focus-visible:ring-destructive",
                      )}
                      autoFocus
                      maxLength={MAX_NAME}
                      aria-invalid={!!nameError}
                    />
                    {nameError ? (
                      <p className="text-[11px] text-destructive">{nameError}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Category</label>
                    <Select value={type} onValueChange={handleTypeChange}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_TYPE_KEYS.map((key) => (
                          <SelectItem key={key} value={key} className="text-sm">
                            {TYPE_CONFIG[key].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ColumnColorPicker
                  value={color}
                  onChange={handleColorChange}
                  showLabel
                />
                <div className="flex gap-2">
                  <LoadingButton
                    size="sm"
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    isPending={createState.isPending}
                    loadingText="Creating…"
                    className="text-xs"
                  >
                    Create
                  </LoadingButton>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelForm}
                    disabled={createState.isPending}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
