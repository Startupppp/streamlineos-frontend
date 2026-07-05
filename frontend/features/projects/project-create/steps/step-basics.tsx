"use client";

import { forwardRef, useImperativeHandle } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembers } from "@/hooks/api/organization";
import { useSimpleClientsList } from "@/hooks/api/crm/clients";
import { basicsSchema } from "../project-create-schema";
import type { BasicsValues } from "../project-create-schema";
import type { StepSharedProps } from "../use-project-create";

export type BasicsHandle = {
  validate: () => Promise<boolean>;
};

export const StepBasics = forwardRef<BasicsHandle, StepSharedProps>(
  function StepBasicsRender({ draft, updateDraft }, ref) {
    const { data: membersData } = useOrgMembers(1, 100);
    const { data: clients } = useSimpleClientsList();
    const members = membersData?.data ?? [];
    const clientList = clients ?? [];

    const form = useForm<BasicsValues>({
      resolver: zodResolver(basicsSchema),
      defaultValues: {
        name: draft.name,
        key: draft.key,
        description: draft.description,
        managerId: draft.managerId || undefined,
        clientId: draft.clientId || undefined,
        startDate: draft.startDate,
        endDate: draft.endDate,
      },
    });

    useImperativeHandle(ref, () => ({
      async validate(): Promise<boolean> {
        const ok = await form.trigger();
        if (ok) {
          const v = form.getValues();
          updateDraft({
            name: v.name,
            key: v.key,
            description: v.description ?? "",
            managerId: v.managerId ?? "",
            clientId: v.clientId ?? "",
            startDate: v.startDate ?? "",
            endDate: v.endDate ?? "",
          });
        }
        return ok;
      },
    }));

    function handleFormSubmit(e: React.FormEvent) {
      e.preventDefault();
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
      const name = e.target.value;
      form.setValue("name", name);
      const key = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
      if (key) form.setValue("key", key);
    }

    function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      form.setValue("key", val);
    }

    function handleManagerChange(value: string) {
      form.setValue("managerId", value);
    }

    function handleClientChange(value: string) {
      form.setValue("clientId", value);
    }

    return (
      <Form {...form}>
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Website Redesign"
                    {...field}
                    onChange={handleNameChange}
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
                <FormLabel>Project Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. WEBR"
                    {...field}
                    onChange={handleKeyChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Description{" "}
                  <span className="text-muted-foreground font-normal">(Optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Briefly describe the project goals..."
                    className="resize-none min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Project Manager{" "}
                  <span className="text-muted-foreground font-normal">(Optional)</span>
                </FormLabel>
                <Select value={field.value} onValueChange={handleManagerChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No manager</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Client{" "}
                  <span className="text-muted-foreground font-normal">(Optional)</span>
                </FormLabel>
                <Select value={field.value} onValueChange={handleClientChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No client</SelectItem>
                    {clientList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    );
  }
);
