"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Lightbulb, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TaskSuggestion {
  ticketId: number;
  title: string;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}

interface TaskSuggestionsProps {
  projectId: number;
}

export function TaskSuggestions({ projectId }: TaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ai/suggestions?type=tasks&projectId=${projectId}`
      );
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch {
      toast.error("Failed to fetch suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = (suggestion: TaskSuggestion) => {
    toast.success(`Accepted suggestion for ticket #${suggestion.ticketId}`);
    setSuggestions((prev) =>
      prev.filter((s) => s.ticketId !== suggestion.ticketId)
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Task Suggestions
          </CardTitle>
          <Button onClick={fetchSuggestions} disabled={loading} size="sm">
            {loading ? "Loading..." : "Get Suggestions"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Click &quot;Get Suggestions&quot; to see AI-recommended tasks
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.ticketId}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">#{suggestion.ticketId}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAccept(suggestion)}
                  className="ml-2"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
