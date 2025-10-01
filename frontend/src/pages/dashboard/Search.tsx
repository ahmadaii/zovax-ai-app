import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";

type Role = "user" | "assistant";
type Variant = "normal" | "log" | "error";
type Msg = { id: number; role: Role; content: string; variant?: Variant };

const STREAM_URL = "/api/chat/stream"; // <-- your FastAPI route

// Payload constants (as requested)
const TENANT_ID = "tenant_001";
const USER_ID = "user_123";
const SESSION_ID = "session_456";

export default function Search() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [assistantStatus, setAssistantStatus] = useState<
    null | "thinking" | "typing"
  >(null);
  const [inFlight, setInFlight] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeAssistantMsgIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const dummyChats = [
    {
      id: 101,
      title:
        "Product Installation Guide With Extra Long Title That Should Be Truncated",
    },
    { id: 102, title: "Customer Support Templates" },
    { id: 103, title: "API Integration Help" },
    { id: 104, title: "Billing and Pricing" },
    { id: 105, title: "Feature Updates" },
  ];

  const intro = {
    title: "Your Memory Hub Awaits",
    subtitle:
      "Search through your knowledge base, chat history, and documents to find exactly what you need.",
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, assistantStatus]);

  function appendMessage(
    role: Role,
    content: string,
    variant: Variant = "normal",
    id?: number
  ) {
    const msg: Msg = { id: id ?? Date.now(), role, content, variant };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }

  function updateAssistantMessageContent(id: number, delta: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m))
    );
  }

  async function streamToFrontend(userText: string) {
    // Abort any previous stream if still running
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInFlight(true);
    setAssistantStatus("thinking");

    try {
      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          user_id: USER_ID,
          session_id: SESSION_ID,
          message: userText,
          reset_context: false,
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Prepare the assistant message that will receive tokens
      activeAssistantMsgIdRef.current = appendMessage("assistant", "");

      const SEP = "###END###";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        // Process complete frames separated by ###END###
        let sepIndex: number;
        while ((sepIndex = buffer.indexOf(SEP)) !== -1) {
          const raw = buffer.slice(0, sepIndex).trim();
          buffer = buffer.slice(sepIndex + SEP.length);

          if (!raw) continue;

          let evt: any;
          try {
            evt = JSON.parse(raw);
          } catch {
            continue; // ignore malformed frames
          }

          const t = evt.type as
            | "log"
            | "first_token"
            | "token"
            | "final_token"
            | "error";

          if (t === "log") {
            // Optional: show logs inline (as light gray assistant bubbles)
            appendMessage("assistant", evt.content ?? "", "log");
            setAssistantStatus("thinking");
          } else if (t === "first_token") {
            setAssistantStatus("typing");
          } else if (t === "token") {
            if (activeAssistantMsgIdRef.current != null) {
              updateAssistantMessageContent(
                activeAssistantMsgIdRef.current,
                evt.content ?? ""
              );
            }
          } else if (t === "final_token") {
            setAssistantStatus(null);
          } else if (t === "error") {
            // Graceful error handling: stop stream, hide status, show error bubble
            try {
              controller.abort();
            } catch {}
            setAssistantStatus(null);
            appendMessage(
              "assistant",
              `⚠️ ${evt.content || "An unexpected error occurred."}`,
              "error"
            );
          }
        }
      }
    } catch {
      setAssistantStatus(null);
      appendMessage(
        "assistant",
        "⚠️ Stream interrupted. Please try again.",
        "error"
      );
    } finally {
      setInFlight(false);
      abortRef.current = null;
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || inFlight) return;

    appendMessage("user", trimmed);
    setInput("");

    await streamToFrontend(trimmed);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setAssistantStatus(null);
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile drawer trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85vw] sm:w-[380px] p-0 border-r border-border bg-muted/40"
            >
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" /> Previous Chats
                </SheetTitle>
              </SheetHeader>
              <div className="p-2 space-y-1">
                {dummyChats.map((chat) => (
                  <Button
                    key={chat.id}
                    variant="ghost"
                    className="w-full justify-start text-left rounded-xl hover:bg-primary/10"
                  >
                    <span className="truncate w-full block" title={chat.title}>
                      {chat.title}
                    </span>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Memory Hub
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={handleReset}
            title="Clear conversation"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Unified container: responsive */}
      <div className="flex h-[75vh] sm:h-[72vh] rounded-2xl shadow-md overflow-hidden border border-border">
        {/* Sidebar (hidden on phones) */}
        <div className="hidden md:flex w-64 bg-muted/40 border-r border-border flex-col">
          <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Previous Chats
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dummyChats.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                className="w-full justify-start text-left rounded-xl hover:bg-primary"
              >
                <span className="truncate w-full block" title={chat.title}>
                  {chat.title}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Messages */}
          <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            {messages.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <Sparkles className="mb-3 h-8 w-8 text-primary/80" />
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {intro.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base sm:text-lg text-muted-foreground">
                  {intro.subtitle}
                </p>
              </div>
            )}

            <ul className="space-y-3 sm:space-y-4">
              {messages.map((m) => {
                const base =
                  "max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm whitespace-pre-wrap break-words";
                const style =
                  m.variant === "error"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : m.variant === "log"
                    ? "bg-muted/60 text-foreground/80"
                    : m.role === "user"
                    ? "bg-gradient-primary text-white"
                    : "bg-muted text-foreground";
                const align =
                  m.role === "user" ? "justify-end" : "justify-start";
                return (
                  <li key={m.id} className={`flex ${align}`}>
                    <div className={`${base} ${style}`}>{m.content}</div>
                  </li>
                );
              })}

              {assistantStatus && (
                <li className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <span>
                        {assistantStatus === "thinking"
                          ? "Assistant is thinking..."
                          : "Assistant is typing..."}
                      </span>
                      <span className="flex gap-1">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:0ms]"></span>
                        <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:120ms]"></span>
                        <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:240ms]"></span>
                      </span>
                    </span>
                  </div>
                </li>
              )}
            </ul>
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="border-t border-border p-2.5 sm:p-4 bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message…"
                className="py-5 sm:py-6 text-base rounded-xl"
                disabled={inFlight}
              />
              <Button
                type="submit"
                size="lg"
                className="px-4 rounded-xl bg-gradient-primary text-white"
                disabled={inFlight}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
