"use client";

import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useSetAgentSkills } from "@/hooks/api/support/macros";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

interface SkillChipProps {
  skill: string;
  onRemove: (skill: string) => void;
}

function SkillChip({ skill, onRemove }: SkillChipProps) {
  const handleRemove = useCallback(() => onRemove(skill), [skill, onRemove]);
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      {skill}
      <button type="button" aria-label={`Remove ${skill}`} onClick={handleRemove}>
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

interface AgentSkillsDialogProps {
  userId: string;
  label: string;
  initialSkills: string[];
  onClose: () => void;
}

export function AgentSkillsDialog({ userId, label, initialSkills, onClose }: AgentSkillsDialogProps) {
  const [skills, setSkills] = useState(initialSkills);
  const [draft, setDraft] = useState("");
  const setAgentSkills = useSetAgentSkills();

  const handleDraftChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value), []);

  const handleAdd = useCallback(() => {
    const value = draft.trim();
    if (!value) return;
    setSkills((current) => (current.includes(value) ? current : [...current, value]));
    setDraft("");
  }, [draft]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleRemove = useCallback((skill: string) => {
    setSkills((current) => current.filter((s) => s !== skill));
  }, []);

  const handleSave = useCallback(() => {
    setAgentSkills.mutate(
      { userId, skills },
      {
        onSuccess: () => {
          toast.success("Skills updated");
          onClose();
        },
        onError: (error) => toast.error(getApiError(error)),
      },
    );
  }, [setAgentSkills, userId, skills, onClose]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skills — {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={handleDraftChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. billing"
              className="h-8"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {skills.map((skill) => (
              <SkillChip key={skill} skill={skill} onRemove={handleRemove} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={setAgentSkills.isPending}>
            {setAgentSkills.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
