"use client"

import { useCallback, useId } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { useCreateOrganization } from "@/hooks/api/organization"
import { useSwitchOrg } from "@/hooks/common/auth-hooks"
import { getErrorMessage } from "@/lib/get-error-message"
import { clearBackendTokenCache } from "@/lib/api-client"
import {
  COUNTRY_OPTIONS,
  DEFAULT_ORG_COUNTRY,
  DEFAULT_ORG_TIMEZONE,
  timezonesForCountry,
} from "@/lib/location/org-locale-options"

const schema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100),
  billingEmail: z.string().max(255).refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "Must be a valid email address",
  ),
  /**
   * BUG-HRMS-009. Both were never collected, so an organization's country stayed
   * null and its time zone stayed `Asia/Kolkata` by column default — every date
   * the org computes reads from that zone. They start on the India-first defaults
   * the columns already applied, so an operator who changes nothing gets exactly
   * what they got before.
   */
  country: z.string().length(2),
  timezone: z.string().min(1).max(64),
})

type FormValues = z.infer<typeof schema>

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const formId = useId()
  const createOrg = useCreateOrganization()
  const switchOrg = useSwitchOrg()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      billingEmail: "",
      country: DEFAULT_ORG_COUNTRY,
      timezone: DEFAULT_ORG_TIMEZONE,
    },
  })

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const slug = toSlug(values.name)
      const billingEmail = values.billingEmail.trim() || undefined
      try {
        const org = await createOrg.mutateAsync({
          name: values.name.trim(),
          slug,
          billingEmail,
          country: values.country,
          timezone: values.timezone,
        })
        clearBackendTokenCache()
        switchOrg.mutate(org.id)
        onOpenChange(false)
        form.reset()
      } catch (err) {
        toast.error(getErrorMessage(err))
      }
    },
    [createOrg, switchOrg, onOpenChange, form],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset()
      onOpenChange(next)
    },
    [form, onOpenChange],
  )

  /** Picking a country cannot leave the form on a zone that country never uses. */
  const handleCountryChange = useCallback(
    (next: string) => {
      form.setValue("country", next)
      const zones = timezonesForCountry(next)
      if (!zones.includes(form.getValues("timezone"))) form.setValue("timezone", zones[0])
    },
    [form],
  )

  const timezoneOptions = timezonesForCountry(form.watch("country"))

  const isPending = createOrg.isPending || switchOrg.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Billing email{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="billing@company.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used for invoices and billing notifications. Defaults to your account email if
                    left blank.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select value={field.value} onValueChange={handleCountryChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((country) => (
                          <SelectItem key={country.value} value={country.value}>
                            {country.label}
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
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time zone</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select time zone" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezoneOptions.map((zone) => (
                          <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Leave dates, payroll cut-offs and attendance are computed in this zone.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={formId}
            size="sm"
            className="flex-1"
            isPending={isPending}
            loadingText="Creating…"
          >
            Create
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
