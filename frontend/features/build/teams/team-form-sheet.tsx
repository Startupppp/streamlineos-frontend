"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome } from "@/components/shared";
import { EmojiIconPicker } from "@/components/ui/emoji-icon-picker";
import type {
  ProjectTeam,
  CreateTeamInput,
  UpdateTeamInput,
} from "@/types/projects";
import {
  teamFormSchema,
  teamFormDefaults,
  type TeamFormValues,
} from "./team-form-schema";
import { TeamColorPickerField } from "./team-color-picker-field";

function toForm(team: ProjectTeam): TeamFormValues {
  return {
    name: team.name,
    key: team.key,
    icon: team.icon ?? "",
    color: team.color ?? "",
    isPrivate: team.isPrivate,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: ProjectTeam;
  onSubmitCreate: (input: CreateTeamInput) => void;
  onSubmitEdit: (input: UpdateTeamInput & { teamId: number }) => void;
  isPending?: boolean;
}

function toTeamKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function teamKeyChange(
  onChange: (value: string) => void,
): (event: React.ChangeEvent<HTMLInputElement>) => void {
  return function handleTeamKeyChange(event) {
    onChange(toTeamKey(event.target.value));
  };
}

export function TeamFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
}: Props) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: teamFormDefaults,
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (open) {
      form.reset(
        mode === "edit" && defaultValues
          ? toForm(defaultValues)
          : teamFormDefaults,
      );
    }
  }, [open, mode, defaultValues, form]);

  function handleNameChange(name: string) {
    if (mode === "create") {
      const auto = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      form.setValue("key", auto, { shouldValidate: false });
    }
  }

  function handleSubmit(v: TeamFormValues) {
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        teamId: defaultValues.id,
        name: v.name,
        icon: v.icon || null,
        color: v.color || null,
        isPrivate: v.isPrivate,
      });
    } else {
      onSubmitCreate({
        name: v.name,
        key: v.key,
        ...(v.icon ? { icon: v.icon } : {}),
        ...(v.color ? { color: v.color } : {}),
        isPrivate: v.isPrivate,
      });
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit Team" : "New Team"}
      description={
        mode === "edit"
          ? "Update team details."
          : "Create a new team to group members and projects."
      }
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="team-form"
            size="sm"
            isPending={isPending}
            loadingText="Saving…"
          >
            {mode === "edit" ? "Save Changes" : "Create Team"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="team-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Engineering, Design, Marketing…"
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Key{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    (uppercase, max 10 chars)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="ENG"
                    disabled={mode === "edit"}
                    onChange={teamKeyChange(field.onChange)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (optional)</FormLabel>
                  <FormControl>
                    <EmojiIconPicker
                      icon={field.value || null}
                      onIconChange={(next) => field.onChange(next ?? "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color (optional)</FormLabel>
                  <FormControl>
                    <TeamColorPickerField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <div className="space-y-0.5">
                  <FormLabel>Private team</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Only members can see this team and its projects.
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheetChrome>
  );
}
