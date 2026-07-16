"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { PlusIcon, MailIcon, MessageCircleIcon, PhoneIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Pencil } from "lucide-react";
import {
  useSupportChannels,
  useCreateSupportChannel,
  useUpdateSupportChannel,
  useDeleteSupportChannel,
  type SupportChannel,
  type SupportChannelType,
} from "@/hooks/api/support/channels";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const CHANNEL_TYPES: { value: SupportChannelType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "chat", label: "Chat" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
];

function channelTypeLabel(type: string) {
  return CHANNEL_TYPES.find((t) => t.value === type)?.label ?? type;
}

function ChannelTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "email") return <MailIcon className={className} />;
  if (type === "chat") return <MessageCircleIcon className={className} />;
  return <PhoneIcon className={className} />;
}

const channelSchema = z.object({
  type: z.enum(["email", "chat", "whatsapp", "sms"]),
  name: z.string().min(1, "Name required").max(100),
  ownerUserId: z.string(),
  configJson: z.string(),
  isActive: z.boolean(),
});
type ChannelForm = z.infer<typeof channelSchema>;

function stringifyConfig(config: Record<string, unknown>) {
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return "{}";
  }
}

interface ChannelDialogProps {
  channel?: SupportChannel;
  onClose: () => void;
}

function ChannelDialog({ channel, onClose }: ChannelDialogProps) {
  const isEdit = !!channel;
  const create = useCreateSupportChannel();
  const update = useUpdateSupportChannel();
  const isPending = create.isPending || update.isPending;

  const ownerUserId =
    typeof channel?.config?.ownerUserId === "string" ? channel.config.ownerUserId : "";
  const restConfig = useMemo(
    () =>
      channel
        ? Object.fromEntries(Object.entries(channel.config).filter(([key]) => key !== "ownerUserId"))
        : {},
    [channel],
  );

  const form = useForm<ChannelForm>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      type: (channel?.type as SupportChannelType) ?? "email",
      name: channel?.name ?? "",
      ownerUserId,
      configJson: stringifyConfig(channel ? (channel.type === "email" ? restConfig : channel.config) : {}),
      isActive: channel?.isActive ?? true,
    },
  });

  const type = form.watch("type");

  const onSubmit = useCallback(
    (data: ChannelForm) => {
      let config: Record<string, unknown> = {};

      if (data.type === "email") {
        const trimmedOwner = data.ownerUserId.trim();
        config = { ...restConfig };
        if (trimmedOwner) config.ownerUserId = trimmedOwner;
      } else {
        try {
          const parsed: unknown = JSON.parse(data.configJson.trim() || "{}");
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error("Config must be a JSON object");
          }
          config = parsed as Record<string, unknown>;
        } catch {
          form.setError("configJson", { message: "Enter valid JSON (e.g. {})" });
          return;
        }
      }

      if (isEdit) {
        update.mutate(
          { id: channel.id, name: data.name, config, isActive: data.isActive },
          {
            onSuccess: () => {
              toast.success("Channel updated");
              onClose();
            },
            onError: (error) => toast.error(getApiError(error)),
          },
        );
      } else {
        create.mutate(
          { type: data.type, name: data.name, config, isActive: data.isActive },
          {
            onSuccess: () => {
              toast.success("Channel created");
              onClose();
            },
            onError: (error) => toast.error(getApiError(error)),
          },
        );
      }
    },
    [create, update, isEdit, channel, onClose, form, restConfig],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Channel" : "New Channel"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHANNEL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && (
                    <FormDescription>Channel type cannot be changed after creation.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Support Inbox" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "email" ? (
              <FormField
                control={form.control}
                name="ownerUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inbox owner</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select org member…"
                      />
                    </FormControl>
                    <FormDescription>
                      The org member this shared inbox is attributed to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="configJson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Config (JSON)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} className="font-mono text-xs" placeholder="{}" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ChannelCardProps {
  channel: SupportChannel;
  onToggle: (channel: SupportChannel) => void;
  onEdit: (channel: SupportChannel) => void;
  onDelete: (channel: SupportChannel) => void;
}

function ChannelCard({ channel, onToggle, onEdit, onDelete }: ChannelCardProps) {
  const handleToggle = useCallback(() => onToggle(channel), [channel, onToggle]);
  const handleEdit = useCallback(() => onEdit(channel), [channel, onEdit]);
  const handleDelete = useCallback(() => onDelete(channel), [channel, onDelete]);

  return (
    <Card className={channel.isActive ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
            <ChannelTypeIcon type={channel.type} className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium truncate">{channel.name}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {channelTypeLabel(channel.type)}
              </Badge>
            </div>
            {channel.type === "email" && typeof channel.config.ownerUserId === "string" && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Owner: {channel.config.ownerUserId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={channel.isActive} onCheckedChange={handleToggle} />
            <Button variant="ghost" size="icon" className="w-7" onClick={handleEdit} aria-label="Edit channel">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              className="w-7 text-destructive"
              onClick={handleDelete}
              aria-label="Delete channel"
              icon={Trash2Icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupportChannelsPage() {
  const { data: channels, isLoading, isError, refetch } = useSupportChannels();
  const updateChannel = useUpdateSupportChannel();
  const deleteChannel = useDeleteSupportChannel();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportChannel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportChannel | null>(null);

  const handleToggle = useCallback(
    (channel: SupportChannel) => {
      updateChannel.mutate(
        { id: channel.id, isActive: !channel.isActive },
        {
          onSuccess: () => toast.success(channel.isActive ? "Channel deactivated" : "Channel activated"),
          onError: (error) => toast.error(getApiError(error)),
        },
      );
    },
    [updateChannel],
  );

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteChannel.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Channel deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getApiError(error)),
    });
  }, [deleteTarget, deleteChannel]);

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  function handleNewChannelAction() {
    setCreateOpen(true);
  }

  function handleCloseCreate() {
    setCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  return (
    <PageWrapper
      title="Channels"
      subtitle="Configure inbound sources that create support tickets"
      actions={
        <AnimatedIconButton size="sm" onClick={handleOpenCreate} icon={PlusIcon} iconClassName="mr-1.5">
          New Channel
        </AnimatedIconButton>
      }
    >
      {isLoading ? (
        <LoadingState variant="list" rows={12} />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : channels && channels.length > 0 ? (
        <div className="space-y-3">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onToggle={handleToggle}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyInboxIllustration />}
          title="No channels yet"
          description="Add an email, chat, WhatsApp, or SMS channel to start turning inbound messages into tickets."
          action={{ label: "New Channel", onClick: handleNewChannelAction }}
          className="flex-1"
        />
      )}

      {createOpen && <ChannelDialog onClose={handleCloseCreate} />}
      {editTarget && <ChannelDialog channel={editTarget} onClose={handleCloseEdit} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete channel?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Inbound messages will no
              longer create tickets through this channel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
