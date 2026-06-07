"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Send, ArrowLeft, Bot, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api } from "@/lib/api";

type Role = "user" | "assistant" | "system";
type Msg = {
  role: Role;
  content: string;
  fileUrl?: string;
  fileName?: string;
};

export default function ChatbotPage(): JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      content:
        "You are MedoraLink, a compassionate healthcare advisor assistant. Be brief (1–2 sentences). For simple greetings, respond with a short friendly line and a concise follow-up question. Do not reference the user's documents unless they explicitly ask or it's clearly relevant. Only add disclaimers when giving medical advice or discussing risks.",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Pull documents context from localStorage (used by documents page)
  const documentContext = useMemo(() => {
    if (typeof window === "undefined") return [] as any[];
    try {
      const saved = localStorage.getItem("mediSplit_documents");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(
    e?: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e?.preventDefault();
    if ((!input.trim() && !file) || loading) return;

    const typed = input.trim();
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (file) {
      fileUrl = URL.createObjectURL(file);
      fileName = file.name;
    }

    // UI shows only what the user typed, without appended document context
    const uiNext: Msg[] = [
      ...messages,
      { role: "user", content: typed, fileUrl, fileName },
    ];
    setMessages(uiNext);
    setInput("");
    setFile(null);
    setLoading(true);

    try {
      // Build payload. Only include documents context when the user asks for it.
      const messagesForApi = buildMessagesForApi(
        uiNext,
        typed,
        documentContext
      );

      const quick = isQuickQuery(typed);
      let res: Response;
      if (file) {
        const formData = new FormData();
        formData.append("messages", JSON.stringify(messagesForApi));
        formData.append("file", file);
        formData.append("quick", "1");
        res = await fetch(api("/api/chat"), { method: "POST", body: formData });
      } else {
        // Stream ALL text-only queries (quick or not!) for an ultra-snappy UX!
        setStreaming(true);
        await streamAssistant(
          uiNext,
          messagesForApi,
          setMessages,
          setStreaming
        );
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data: { reply?: string; error?: string } = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || data.error || "Something went wrong.",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${err?.message || "Request failed"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h1 className="text-xl font-semibold">AI Health Assistant</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/documents" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Documents
            </a>
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center w-full">
          <div className="w-full max-w-3xl flex-1 overflow-y-auto px-1 sm:px-2 md:px-0 py-4 space-y-4">
            <AnimatePresence>
              {messages
                .filter((m) => m.role !== "system")
                .map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[75%] text-sm leading-relaxed shadow-md ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground"
                      }`}
                    >
                      {m.fileUrl && (
                        <div className="mb-2 text-xs">
                          <a
                            href={m.fileUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 underline"
                          >
                            <Paperclip className="w-3 h-3" />{" "}
                            {m.fileName || "Uploaded file"}
                          </a>
                        </div>
                      )}
                      {m.content}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>

            {(loading || streaming) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="rounded-2xl px-4 py-3 bg-card border border-border text-muted-foreground text-sm shadow-sm animate-pulse">
                  Assistant is typing…
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="w-full max-w-3xl border border-border bg-card rounded-2xl p-3 sm:p-4 flex items-end gap-2 shadow-md mb-4"
          >
            <label className="relative cursor-pointer flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition">
              <Paperclip className="w-4 h-4 mr-1" />
              Attach
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            {file && (
              <div className="flex items-center gap-2 max-w-[220px] border border-border rounded-lg px-2 py-1 bg-muted text-muted-foreground text-xs">
                <Paperclip className="w-3 h-3" />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <textarea
              className="flex-1 resize-none rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              rows={2}
              placeholder="Ask about your documents, prescriptions, symptoms…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <motion.button
              type="submit"
              disabled={loading || (!input.trim() && !file)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Send
            </motion.button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

function buildUserContent(raw: string, docs: any[]): string {
  const intentRegex =
    /(document|documents|record|records|result|results|file|files|report|reports|prescription|insurance|upload|pdf|image|jpg|png)/i;
  if (!intentRegex.test(raw)) return raw;
  if (!docs || docs.length === 0) return raw;
  try {
    const summarized = docs
      .slice(0, 3)
      .map((d) => {
        const name = truncateText(d?.name || "Untitled", 60);
        const type = d?.type || "other";
        const verified = d?.verified ? "verified" : "pending";
        return `- ${name} (${type}, ${verified})`;
      })
      .join("\n");
    return `${raw}\n\n[User Documents]\n${summarized}`;
  } catch {
    return raw;
  }
}

function truncateText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function buildMessagesForApi(all: Msg[], typed: string, docs: any[]): Msg[] {
  if (!all.length) return all;
  const cloned = [...all];
  const lastIndex = cloned.length - 1;
  // Replace last user message content with augmented content including minimal docs context
  cloned[lastIndex] = {
    ...cloned[lastIndex],
    content: buildUserContent(typed, docs),
  };
  return pruneMessagesForApi(cloned);
}

function pruneMessagesForApi(all: Msg[], keep: number = 4): Msg[] {
  // Keep system messages (if any) and last N non-system messages to reduce latency
  const systemMsgs = all.filter((m) => m.role === "system");
  const nonSystem = all.filter((m) => m.role !== "system");
  const tail = nonSystem.slice(Math.max(nonSystem.length - keep, 0));
  return [...systemMsgs.slice(-1), ...tail];
}

function isQuickQuery(raw: string): boolean {
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  const greetingRegex =
    /^(hi|hello|hey|yo|sup|howdy|hola|hallo|bonjour|morning|evening|afternoon)\b/i;
  // Treat short prompts (including doc lookups without a new upload) as quick
  return greetingRegex.test(raw) || words <= 12;
}

async function streamAssistant(
  uiNext: Msg[],
  messagesForApi: Msg[],
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>,
  setStreaming: (b: boolean) => void
): Promise<void> {
  try {
    const res = await fetch(api("/api/chat/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messagesForApi, quick: true }),
    });
    if (!res.ok || !res.body) {
      throw new Error(await res.text());
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantBuffer = "";
    let streamBuffer = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        // Flush any remaining characters in the streamBuffer
        if (streamBuffer.trim()) {
          const line = streamBuffer.trim();
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6);
            if (rawData !== "[DONE]") {
              try {
                const parsed = JSON.parse(rawData);
                assistantBuffer += parsed.text;
              } catch {
                assistantBuffer += rawData;
              }
            }
          }
        }
        break;
      }
      streamBuffer += decoder.decode(value, { stream: true });

      let newlineIndex;
      while ((newlineIndex = streamBuffer.indexOf("\n")) !== -1) {
        const line = streamBuffer.slice(0, newlineIndex).trim();
        streamBuffer = streamBuffer.slice(newlineIndex + 1);

        if (!line) continue;
        if (line.startsWith("event: done")) {
          continue;
        }
        if (line.startsWith("data: ")) {
          const rawData = line.slice(6);
          if (rawData === "[DONE]") continue;

          try {
            const parsed = JSON.parse(rawData);
            assistantBuffer += parsed.text;
          } catch {
            assistantBuffer += rawData;
          }

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: assistantBuffer,
              };
            }
            return updated;
          });
        }
      }
    }
  } catch (e) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Sorry, I had trouble streaming a reply. Please try again.",
      },
    ]);
  } finally {
    setStreaming(false);
  }
}