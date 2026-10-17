import {
  MailContentSkeleton,
  MailHeaderSkeleton,
} from "@/features/mail/mail-shell-skeletons";

export default function MailLoading() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <MailHeaderSkeleton />
      <MailContentSkeleton />
    </div>
  );
}
