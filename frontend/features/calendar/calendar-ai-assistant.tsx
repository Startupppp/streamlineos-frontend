"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Minus, Maximize2, X, Check, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateCalendarEvent, useCalendarOrgMembers } from "@/hooks/api/calendar";
import { format, addHours, addDays, startOfHour } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format-utils";
import { MarkdownContent } from "@/components/markdown/markdown-content";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    subject: string;
    start: Date;
    end: Date;
    attendees: string[];
    organizer: string;
    isConfirmed?: boolean;
  };
}

interface CalendarAiAssistantProps {
  onEventCreated?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarAiAssistant({ onEventCreated, isOpen, onClose }: CalendarAiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your StreamlineOS AI assistant. I can help you schedule events and invite team members. Try saying:\n\n*\"Schedule a meeting with Aditya tomorrow at 10 AM\"* or *\"Create event and invite Tarun\"*",
      timestamp: format(new Date(), "h:mm a"),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [headerTitle, setHeaderTitle] = useState("Ask AI");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const createEventMutation = useCreateCalendarEvent();
  const { data: members = [] } = useCalendarOrgMembers();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isMinimized]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue("");
    }

    const timestamp = format(new Date(), "h:mm a");
    const userMsgId = `user-${Date.now()}`;
    const newUserMsg: Message = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp,
    };

    setMessages((prev) => [...prev, newUserMsg]);

    // Handle "Let's do it" confirmation
    if (text.toLowerCase() === "let's do it") {
      // Find the last assistant message with unconfirmed metadata
      const pendingMsgIndex = [...messages].reverse().findIndex(
        (m) => m.role === "assistant" && m.metadata && !m.metadata.isConfirmed
      );

      if (pendingMsgIndex !== -1) {
        const actualIndex = messages.length - 1 - pendingMsgIndex;
        const pendingMsg = messages[actualIndex];
        const meta = pendingMsg.metadata;

        if (meta) {
          try {
            // Find attendee IDs in organization members
            const attendeeIds: string[] = [];
            meta.attendees.forEach((attName) => {
              const matchedMember = members.find(
                (m) =>
                  `${m.firstName || ""} ${m.lastName || ""}`
                    .toLowerCase()
                    .includes(attName.toLowerCase()) ||
                  (m.name && m.name.toLowerCase().includes(attName.toLowerCase()))
              );
              if (matchedMember) {
                attendeeIds.push(matchedMember.id);
              }
            });

            await createEventMutation.mutateAsync({
              title: meta.subject,
              startDate: meta.start.toISOString(),
              endDate: meta.end.toISOString(),
              category: "meeting",
              color: "blue",
              attendeeIds,
            });

            // Mark confirmed in state
            setMessages((prev) => {
              const updated = [...prev];
              const target = updated[actualIndex];
              if (target && target.metadata) {
                target.metadata = { ...target.metadata, isConfirmed: true };
              }
              return updated;
            });

            // Insert system notification of event creation
            setMessages((prev) => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                role: "system",
                content: `Ask AI has created ${meta.subject}`,
                timestamp: format(new Date(), "h:mm a"),
              },
              {
                id: `assistant-confirm-${Date.now()}`,
                role: "assistant",
                content: `OK. I've scheduled the meeting with **${meta.attendees.join(", ")}** for tomorrow, ${format(meta.start, "MMMM d, yyyy")}, from ${format(meta.start, "h:mm a")} to ${format(meta.end, "h:mm a")}.`,
                timestamp: format(new Date(), "h:mm a"),
              },
            ]);

            toast.success(`Event "${meta.subject}" scheduled successfully!`);
            onEventCreated?.();
          } catch {
            toast.error("Failed to schedule the event");
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-err-${Date.now()}`,
                role: "assistant",
                content: "I ran into an issue scheduling that event. Please check your parameters and try again.",
                timestamp: format(new Date(), "h:mm a"),
              },
            ]);
          }
        }
      }
      return;
    }

    // Process scheduling prompts
    setTimeout(() => {
      const lowerText = text.toLowerCase();
      let invitee = "Aditya";
      if (lowerText.includes("aditya")) invitee = "Aditya";
      else if (lowerText.includes("tarun")) invitee = "Tarun chintakunta";
      else {
        // Try to match other organization members
        const matched = members.find((m) =>
          (m.firstName && lowerText.includes(m.firstName.toLowerCase())) ||
          (m.name && lowerText.includes(m.name.toLowerCase()))
        );
        if (matched) invitee = matched.name || `${matched.firstName} ${matched.lastName || ""}`.trim();
      }

      // Default meeting parameters
      let meetingSubject = `Meeting with ${invitee}`;
      let startDate = startOfHour(addHours(addDays(new Date(), 1), 0)); // Tomorrow same hour
      startDate.setHours(10, 0, 0, 0); // 10:00 AM
      let endDate = addHours(startDate, 1); // 11:00 AM

      // Simple keyword detection for subject & time
      if (lowerText.includes("tomorrow")) {
        startDate = startOfHour(addDays(new Date(), 1));
        startDate.setHours(10, 0, 0, 0);
        endDate = addHours(startDate, 1);
      }
      if (lowerText.includes("10 am") || lowerText.includes("10:00 am")) {
        startDate.setHours(10, 0, 0, 0);
        endDate = addHours(startDate, 1);
      } else if (lowerText.includes("11 am") || lowerText.includes("11:00 am")) {
        startDate.setHours(11, 0, 0, 0);
        endDate = addHours(startDate, 1);
      } else if (lowerText.includes("2 pm") || lowerText.includes("14:00")) {
        startDate.setHours(14, 0, 0, 0);
        endDate = addHours(startDate, 1);
      }

      // Update panel title to match the command
      setHeaderTitle(`Create event and invite ${invitee.split(" ")[0]}`);
      setHasNewMessage(true);

      const aiMsgId = `ai-${Date.now()}`;
      const newAiMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: `Certainly! I'll create a meeting for tomorrow and invite ${invitee.split(" ")[0]}.`,
        timestamp: format(new Date(), "h:mm a"),
        metadata: {
          subject: meetingSubject,
          start: startDate,
          end: endDate,
          attendees: ["Tarun chintakunta", invitee],
          organizer: "Tarun chintakunta",
        },
      };

      setMessages((prev) => [...prev, newAiMsg]);
    }, 800);
  }, [inputValue, messages, createEventMutation, members, onEventCreated]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col rounded-xl border border-border bg-card shadow-2xl transition-all duration-300 ${
        isMinimized ? "h-12" : "h-[480px]"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
          <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
            {headerTitle}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Maximize"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* New messages notification */}
      {hasNewMessage && !isMinimized && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 shrink-0 text-xs text-amber-700 dark:text-amber-400">
          <span className="font-medium">1 new message</span>
          <button
            type="button"
            onClick={() => setHasNewMessage(false)}
            className="flex items-center gap-1 hover:underline font-semibold"
          >
            Mark as Read <Check className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Message history */}
      {!isMinimized && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <div key={m.id} className="relative flex py-2 items-center justify-center shrink-0">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-rose-500/30"></div>
                    </div>
                    <span className="relative bg-card px-3 text-[10px] font-medium text-rose-500 flex items-center gap-1.5">
                      {m.content}
                      <span className="bg-rose-500 text-white text-[8px] font-bold px-1 rounded">NEW</span>
                      <span className="text-muted-foreground ml-1">{m.timestamp}</span>
                    </span>
                  </div>
                );
              }

              const isUser = m.role === "user";

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <Avatar className="h-7 w-7 border shrink-0">
                    <AvatarFallback className={`text-[10px] ${isUser ? "bg-primary text-primary-foreground" : "bg-violet-500/10 text-violet-600 font-semibold"}`}>
                      {isUser ? "T" : <Bot className="h-3.5 w-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {isUser ? "Tarun" : "Ask AI"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{m.timestamp}</span>
                    </div>
                    <div
                      className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
                        isUser
                          ? "bg-blue-500 text-white shadow-sm whitespace-pre-wrap"
                          : "bg-muted/60 text-foreground border border-border"
                      }`}
                    >
                      {isUser ? m.content : <MarkdownContent content={m.content} />}
                    </div>

                    {/* Metadata Card (Structured meeting preview) */}
                    {m.metadata && (
                      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-[11px] shadow-sm max-w-xs">
                        <div className="grid grid-cols-3 gap-y-1 text-muted-foreground">
                          <span className="font-semibold text-foreground col-span-3 pb-1 border-b">
                            Meeting Details
                          </span>
                          <span className="font-medium pt-1">Subject:</span>
                          <span className="col-span-2 text-foreground font-medium pt-1">
                            {m.metadata.subject}
                          </span>
                          <span className="font-medium">Start:</span>
                          <span className="col-span-2 text-foreground font-mono">
                            {format(m.metadata.start, "dd/MM/yyyy hh:mm:ss a")}
                          </span>
                          <span className="font-medium">Stop:</span>
                          <span className="col-span-2 text-foreground font-mono">
                            {format(m.metadata.end, "dd/MM/yyyy hh:mm:ss a")}
                          </span>
                          <span className="font-medium">Attendees:</span>
                          <span className="col-span-2 text-foreground">
                            Add: {m.metadata.attendees.join(", ")}
                          </span>
                          <span className="font-medium">Organizer:</span>
                          <span className="col-span-2 text-foreground">{m.metadata.organizer}</span>
                        </div>

                        {!m.metadata.isConfirmed && (
                          <div className="pt-2 flex justify-start">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-medium border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => handleSend("Let's do it")}
                              disabled={createEventMutation.isPending}
                            >
                              {createEventMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              Let's do it
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-center gap-1.5 p-3 border-t bg-muted/20 shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask AI to schedule or invite..."
              className="flex-1 h-8 rounded-md border border-input px-3 text-xs bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 shrink-0 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!inputValue.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
