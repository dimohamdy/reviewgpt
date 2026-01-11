"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatSidebar } from "./chat-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatMetadata {
  reviewCount: number;
  avgSimilarity: number;
  model: string;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  themes?: string[];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<ChatMetadata | null>(null);
  const [currentReviews, setCurrentReviews] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || loading) return;

    // Add user message
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    // Add empty assistant message that we'll stream into
    const assistantMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let assistantResponse = "";
      let metadata: ChatMetadata | null = null;
      let reviews: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "metadata") {
                metadata = data.data;
                setCurrentMetadata(data.data);
                if (data.data.reviews) {
                  setCurrentReviews(data.data.reviews);
                }
              } else if (data.type === "text") {
                assistantResponse += data.data;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[assistantMessageIndex] = {
                    role: "assistant",
                    content: assistantResponse,
                  };
                  return newMessages;
                });
              } else if (data.type === "done") {
                // Stream complete
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });

      // Remove the empty assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "What are the main complaints from users?",
    "What features do users request most?",
    "Summarize the positive feedback",
    "What issues have been reported in the last week?",
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Chat with ReviewGPT</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your app reviews
          </p>
        </div>
        {currentMetadata && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            View Context ({currentMetadata.reviewCount} reviews)
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">💬</div>
              <h3 className="text-lg font-semibold">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask questions about your reviews and get AI-powered insights
                using semantic search
              </p>
            </div>

            <div className="space-y-2 w-full max-w-2xl">
              <p className="text-xs text-muted-foreground text-center">
                Try asking:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sampleQueries.map((query, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(query)}
                    disabled={loading}
                    className="justify-start text-left h-auto py-3"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((message, idx) => (
              <ChatMessage key={idx} role={message.role} content={message.content} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Searching reviews and generating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4">
        <ChatInput onSubmit={handleSubmit} disabled={loading} />
      </div>

      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        reviews={currentReviews}
        metadata={currentMetadata || undefined}
      />
    </div>
  );
}
