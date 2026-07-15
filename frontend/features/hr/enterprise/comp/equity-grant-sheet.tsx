"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome, MemberPicker } from "@/components/shared";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateEquityGrant } from "@/hooks/api/hr/enterprise-comp";

const schema = z.object({
  userId: z.string().min(1, "Required"),
  grantType: z.enum(["ISO", "NSO", "RSU", "other"]),
  units: z.number().int().positive(),
  strikePriceCents: z.number().int().min(0).optional(),
  grantDate: z.string().min(1, "Required"),
  cliffMonths: z.number().int().min(0),
  vestingMonths: z.number().int().positive(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function EquityGrantSheet({ open, onOpenChange }: Props) {
  const createMut = useCreateEquityGrant();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { grantType: "RSU", cliffMonths: 12, vestingMonths: 48, userId: "", grantDate: "" },
  });

  function handleCancel() {
    onOpenChange(false);
  }

  function onSubmit(values: FormValues) {
    createMut.mutate(
      {
        ...values,
        units: Number(values.units),
        cliffMonths: Number(values.cliffMonths),
        vestingMonths: Number(values.vestingMonths),
      },
      {
        onSuccess: () => {
          toast.success("Equity grant created with vesting schedule");
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
      title="New Equity Grant"
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="equity-grant-form"
            isPending={createMut.isPending}
            loadingText="Creating…"
          >
            Create Grant
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="equity-grant-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <FormControl>
                  <MemberPicker
                    mode="single"
                    value={field.value || undefined}
                    onChange={(id) => field.onChange(id ?? "")}
                    placeholder="Select employee"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grantType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grant Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ISO">ISO</SelectItem>
                    <SelectItem value="NSO">NSO</SelectItem>
                    <SelectItem value="RSU">RSU</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="units"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strikePriceCents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strike Price (cents)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : e.target.valueAsNumber,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="grantDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grant Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="cliffMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliff (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vestingMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vesting (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheetChrome>
  );
}
