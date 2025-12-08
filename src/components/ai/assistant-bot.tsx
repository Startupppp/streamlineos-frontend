"use client";

import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, X, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function AssistantBot() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
        >
          <Bot className="h-8 w-8 text-white" />
        </Button>
      )}

      {isOpen && (
        <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10 fade-in border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <CardTitle className="text-md">Vaivamm AI</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
             <div className="h-full overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm mt-10">
                        <Bot className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>Hello! I am your AI assistant.</p>
                        <p>Ask me about attendance, payroll, or projects.</p>
                    </div>
                )}
                {messages.map(m => (
                    <div key={m.id} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            m.role === 'user' 
                                ? "bg-primary text-primary-foreground rounded-br-none" 
                                : "bg-white dark:bg-zinc-800 border shadow-sm rounded-bl-none"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}
            </div>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input 
                value={input} 
                onChange={handleInputChange} 
                placeholder="Type a message..." 
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
