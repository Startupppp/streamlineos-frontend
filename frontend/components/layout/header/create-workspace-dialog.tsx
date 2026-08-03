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
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { useCreateOrganization } from "@/hooks/api/organization"
import { useSwitchOrg } from "@/hooks/common/auth-hooks"
import { getErrorMessage } from "@/lib/get-error-message"
import { clearBackendTokenCache } from "@/lib/api-client"

const schema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100),
  billingEmail: z.string().max(255).refine(
    (v) => v === "" || z.string().email().safeParse(v).success,
    "Must be a valid email address",
  ),
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
    defaultValues: { name: "", billingEmail: "" },
  })

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      const slug = toSlug(values.name)
      const billingEmail = values.billingEmail.trim() || undefined
      try {
        const org = await createOrg.mutateAsync({ name: values.name.trim(), slug, billingEmail })
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

  const isPending = createOrg.isPending || switchOrg.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
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
          </form>
        </Form>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={formId}
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
