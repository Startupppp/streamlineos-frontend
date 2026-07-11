"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileSignature,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useSentSignatureRequests,
  useReceivedSignatureRequests,
  useCreateSignatureRequest,
  useSignDocument,
  useVoidSignatureRequest,
  type SignatureRequest,
  type SignatureSigner,
} from "@/hooks/api/hr";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";

const DOCUMENT_TYPES = ["CONTRACT", "NDA", "OFFER_LETTER", "POLICY", "OTHER"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

interface NewSigner {
  userId: string;
  order: number;
  status: string;
}

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default" },
  COMPLETED: { label: "Completed", variant: "default" },
  VOIDED: { label: "Voided", variant: "destructive" },
};

function SignerProgress({ signers }: { signers: SignatureSigner[] }) {
  const signed = signers.filter((s) => s.status === "SIGNED").length;
  const total = signers.length;
  const pct = total > 0 ? (signed / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {signed}/{total} signed
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AuditTrailSection({ entries }: { entries: SignatureRequest["auditTrail"] }) {
  const [open, setOpen] = useState(false);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Audit trail ({entries.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-1 overflow-hidden"
          >
            {entries.map((entry, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                <span className="font-medium">{entry.action}</span>
                <span>·</span>
                <span className="truncate">{entry.userId}</span>
                <span className="ml-auto tabular-nums">
                  {format(new Date(entry.timestamp), "MMM d, HH:mm")}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignatureCard({
  request,
  showSignButton,
  showVoidButton,
  onSign,
  onVoid,
}: {
  request: SignatureRequest;
  showSignButton: boolean;
  showVoidButton: boolean;
  onSign: (request: SignatureRequest) => void;
  onVoid: (id: number) => void;
}) {
  const statusCfg = STATUS_CONFIG[request.status] ?? { label: request.status, variant: "outline" as StatusVariant };

  function handleSign() {
    onSign(request);
  }

  function handleVoid() {
    onVoid(request.id);
  }

  return (
    <motion.div variants={fadeUp}>
      <Card className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm text-foreground truncate">{request.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[11px] font-medium">
                  {request.documentType}
                </Badge>
                <Badge variant={statusCfg.variant} className="text-[11px]">
                  {statusCfg.label}
                </Badge>
                {request.expiresAt && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expires {format(new Date(request.expiresAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
            <a
              href={request.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <SignerProgress signers={request.signers} />

          <div className="flex items-center gap-2 pt-1">
            {showSignButton && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleSign}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PenLine className="h-3.5 w-3.5" />
                Sign
              </motion.button>
            )}
            {showVoidButton &&
              (request.status === "PENDING" || request.status === "IN_PROGRESS") && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleVoid}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Void
                </motion.button>
              )}
          </div>

          <AuditTrailSection entries={request.auditTrail} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[320px] gap-3">
      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
        <FileSignature className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

function SignRequestGrid({
  requests,
  showSignButton,
  showVoidButton,
  emptyMessage,
  onSign,
  onVoid,
}: {
  requests: SignatureRequest[];
  showSignButton: boolean;
  showVoidButton: boolean;
  emptyMessage: string;
  onSign: (r: SignatureRequest) => void;
  onVoid: (id: number) => void;
}) {
  if (requests.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {requests.map((r) => (
        <SignatureCard
          key={r.id}
          request={r}
          showSignButton={showSignButton}
          showVoidButton={showVoidButton}
          onSign={onSign}
          onVoid={onVoid}
        />
      ))}
    </motion.div>
  );
}

export default function SignaturesPage() {
  const canManage = useCan("hr:signatures:manage");
  const { data: sentData = [], isLoading: sentLoading } = useSentSignatureRequests();
  const { data: receivedData = [], isLoading: receivedLoading } = useReceivedSignatureRequests();
  const createMutation = useCreateSignatureRequest();
  const signMutation = useSignDocument();
  const voidMutation = useVoidSignatureRequest();

  const [signDialogRequest, setSignDialogRequest] = useState<SignatureRequest | null>(null);
  const [typedName, setTypedName] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDocType, setNewDocType] = useState<DocumentType>("CONTRACT");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newSigners, setNewSigners] = useState<NewSigner[]>([{ userId: "", order: 1, status: "PENDING" }]);

  const completedRequests = sentData.filter((r) => r.status === "COMPLETED");
  const voidedRequests = sentData.filter((r) => r.status === "VOIDED");

  function handleOpenSign(request: SignatureRequest) {
    setSignDialogRequest(request);
    setTypedName("");
  }

  function handleCloseSignDialog() {
    setSignDialogRequest(null);
    setTypedName("");
  }

  function handleSignDialogOpenChange(open: boolean) {
    if (!open) handleCloseSignDialog();
  }

  function handleTypedNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTypedName(e.target.value);
  }

  async function handleConfirmSign() {
    if (!signDialogRequest || !typedName.trim()) return;
    try {
      await signMutation.mutateAsync({ id: signDialogRequest.id, signatureUrl: typedName.trim() });
      toast.success("Document signed successfully.");
      handleCloseSignDialog();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleVoid(id: number) {
    try {
      await voidMutation.mutateAsync(id);
      toast.success("Signature request voided.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleAddSigner() {
    setNewSigners((prev) => [
      ...prev,
      { userId: "", order: prev.length + 1, status: "PENDING" },
    ]);
  }

  function handleRemoveSigner(index: number) {
    setNewSigners((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSignerUserIdChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setNewSigners((prev) => prev.map((s, i) => (i === index ? { ...s, userId: value } : s)));
  }

  function handleSignerOrderChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const order = parseInt(e.target.value, 10);
    if (!isNaN(order)) {
      setNewSigners((prev) => prev.map((s, i) => (i === index ? { ...s, order } : s)));
    }
  }

  function handleNewTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewTitle(e.target.value);
  }

  function handleNewDocUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewDocUrl(e.target.value);
  }

  function handleNewExpiresAtChange(value: string) {
    setNewExpiresAt(value);
  }

  function handleDocTypeChange(value: string) {
    setNewDocType(value as DocumentType);
  }

  function handleSheetOpenChange(open: boolean) {
    setIsSheetOpen(open);
  }

  async function handleCreateSubmit() {
    if (!newTitle.trim() || !newDocUrl.trim() || newSigners.some((s) => !s.userId.trim())) {
      toast.error("Please fill in all required fields and signer IDs.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        title: newTitle.trim(),
        documentType: newDocType,
        documentUrl: newDocUrl.trim(),
        expiresAt: newExpiresAt || undefined,
        signers: newSigners,
      });
      toast.success("Signature request created.");
      setIsSheetOpen(false);
      setNewTitle("");
      setNewDocType("CONTRACT");
      setNewDocUrl("");
      setNewExpiresAt("");
      setNewSigners([{ userId: "", order: 1, status: "PENDING" }]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleOpenSheet() {
    setIsSheetOpen(true);
  }

  function handleRemoveSignerAt(index: number) {
    return () => handleRemoveSigner(index);
  }

  function handleSignerUserIdChangeAt(index: number) {
    return (e: React.ChangeEvent<HTMLInputElement>) => handleSignerUserIdChange(index, e);
  }

  function handleSignerOrderChangeAt(index: number) {
    return (e: React.ChangeEvent<HTMLInputElement>) => handleSignerOrderChange(index, e);
  }

  return (
    <PageWrapper
      title="Digital Signatures"
      subtitle="Send, sign, and track document signatures"
      actions={
        canManage ? (
          <Button
            onClick={handleOpenSheet}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Request
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="received" className="space-y-4">
        <TabsList>
          <TabsTrigger value="received" className="text-xs">
            Received
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs">
            Sent
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed
          </TabsTrigger>
          <TabsTrigger value="voided" className="text-xs">
            Voided
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          {receivedLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <SignRequestGrid
              requests={receivedData}
              showSignButton
              showVoidButton={false}
              emptyMessage="No documents awaiting your signature."
              onSign={handleOpenSign}
              onVoid={handleVoid}
            />
          )}
        </TabsContent>

        <TabsContent value="sent">
          {sentLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <SignRequestGrid
              requests={sentData}
              showSignButton={false}
              showVoidButton={canManage}
              emptyMessage="You haven't sent any signature requests yet."
              onSign={handleOpenSign}
              onVoid={handleVoid}
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          <SignRequestGrid
            requests={completedRequests}
            showSignButton={false}
            showVoidButton={false}
            emptyMessage="No completed signature requests."
            onSign={handleOpenSign}
            onVoid={handleVoid}
          />
        </TabsContent>

        <TabsContent value="voided">
          <SignRequestGrid
            requests={voidedRequests}
            showSignButton={false}
            showVoidButton={false}
            emptyMessage="No voided signature requests."
            onSign={handleOpenSign}
            onVoid={handleVoid}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!signDialogRequest} onOpenChange={handleSignDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
          </DialogHeader>
          {signDialogRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted border border-border space-y-1">
                <p className="text-sm font-semibold text-foreground">{signDialogRequest.title}</p>
                <a
                  href={signDialogRequest.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  View document
                </a>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="typed-name" className="text-xs font-medium">
                  Your typed name (as signature)
                </Label>
                <Input
                  id="typed-name"
                  value={typedName}
                  onChange={handleTypedNameChange}
                  placeholder="Type your full name"
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseSignDialog} className="text-xs">
              Cancel
            </Button>
            <Button
              disabled={!typedName.trim() || signMutation.isPending}
              onClick={handleConfirmSign}
              className="text-xs"
            >
              {signMutation.isPending ? "Signing…" : "Confirm Signature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
            <SheetTitle>New Signature Request</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="sig-title" className="text-xs font-medium">
                Title
              </Label>
              <Input
                id="sig-title"
                value={newTitle}
                onChange={handleNewTitleChange}
                placeholder="e.g. Employment Contract — John Doe"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sig-doc-type" className="text-xs font-medium">
                Document Type
              </Label>
              <Select value={newDocType} onValueChange={handleDocTypeChange}>
                <SelectTrigger id="sig-doc-type" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-sm">
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sig-doc-url" className="text-xs font-medium">
                Document URL
              </Label>
              <Input
                id="sig-doc-url"
                type="url"
                value={newDocUrl}
                onChange={handleNewDocUrlChange}
                placeholder="https://..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sig-expires" className="text-xs font-medium">
                Expires At (optional)
              </Label>
              <DatePicker id="sig-expires" value={newExpiresAt ?? ""} onChange={handleNewExpiresAtChange} placeholder="Pick a date" className="text-sm" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Signers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSigner}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Signer
                </Button>
              </div>
              <div className="space-y-2">
                {newSigners.map((signer, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={signer.userId}
                      onChange={handleSignerUserIdChangeAt(idx)}
                      placeholder="User ID"
                      className="text-sm flex-1"
                    />
                    <Input
                      type="number"
                      value={signer.order}
                      onChange={handleSignerOrderChangeAt(idx)}
                      className="text-sm w-16"
                      min={1}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 flex-shrink-0"
                      onClick={handleRemoveSignerAt(idx)}
                      disabled={newSigners.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
              className="text-xs"
            >
              {createMutation.isPending ? "Creating…" : "Create Request"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
