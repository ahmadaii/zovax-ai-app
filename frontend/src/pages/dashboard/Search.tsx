import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, MessageSquare, Plus } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import { useTenant } from "@/contexts/TenantContext";

type Role = "user" | "assistant";
type Variant = "normal" | "log" | "error";
type Msg = { id: number; role: Role; content: string; variant?: Variant };

const STREAM_URL =
  import.meta.env.VITE_API_BASE_URL + "/conversation/chat_response";

export default function Search() {
  const { ready, user, token, signOut } = useTenant(); // <-- get token & user
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [assistantStatus, setAssistantStatus] = useState<
    null | "thinking" | "typing"
  >(null);
  const [inFlight, setInFlight] = useState(false);

  // Conversation/session state
  const [sessionId, setSessionId] = useState<string | null>(null); // null = brand new chat
  const [topic, setTopic] = useState<string>("New chat");
  const [hasActiveNewChat, setHasActiveNewChat] = useState<boolean>(true); // true until backend returns session/topic

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const activeAssistantMsgIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
    // Guard: must be ready and signed in
    if (!ready) {
      appendMessage(
        "assistant",
        "⚠️ App is still initializing. Please try again in a moment.",
        "error"
      );
      return;
    }
    if (!token || !user) {
      appendMessage("assistant", "🔒 Please sign in to chat.", "error");
      return;
    }

    // Abort previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInFlight(true);
    setAssistantStatus("thinking");

    try {
      const payload: Record<string, any> = {
        tenant_id: String(user.tenant_id ?? ""),
        user_id: String(user.user_id),
        message: userText,
        reset_context: false,
      };

      // Only include session_id once we have it.
      if (sessionId) {
        payload.session_id = sessionId;
      }

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // Handle auth failure before reading the stream
      if (resp.status === 401) {
        setAssistantStatus(null);
        appendMessage(
          "assistant",
          "🔒 Your session has expired or is invalid. Please sign in again.",
          "error"
        );
        try {
          signOut();
        } catch {}
        setInFlight(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Prepare the assistant message that will receive tokens
      activeAssistantMsgIdRef.current = appendMessage("assistant", "");

      // Accept both "###END###" and "###END###\n"
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
          // remove SEP and any trailing newline
          buffer = buffer.slice(sepIndex + SEP.length);
          if (buffer.startsWith("\n")) buffer = buffer.slice(1);

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
            | "error"
            | "session"; // <-- NEW: session metadata frame

          if (t === "log") {
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
          } else if (t === "session") {
            // Backend should send: { type: "session", session_id, topic }
            if (evt.session_id && typeof evt.session_id === "string") {
              setSessionId(evt.session_id);
              setHasActiveNewChat(false);
            }
            if (evt.topic && typeof evt.topic === "string") {
              setTopic(evt.topic);
            }
          } else if (t === "error") {
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
    } catch (err: any) {
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

  const hardResetConversationState = () => {
    // Reset UI and conversation state to a fresh "New chat"
    abortRef.current?.abort();
    setMessages([]);
    setAssistantStatus(null);
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;

    setSessionId(null);
    setTopic("New chat");
    setHasActiveNewChat(true);
  };

  const handleReset = () => {
    // Clear the current conversation but keep the session if it exists
    abortRef.current?.abort();
    setMessages([]);
    setAssistantStatus(null);
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;
  };

  const handleNewChat = () => {
    // Only allow one active "new chat" at a time.
    // If we're already in a brand-new chat (no session & no messages), ignore.
    const alreadyFresh =
      hasActiveNewChat && sessionId === null && messages.length === 0;

    if (alreadyFresh) return;

    // Otherwise, move to a brand-new chat state.
    hardResetConversationState();
  };

  const newChatButton = (
    <Button
      onClick={handleNewChat}
      className="w-full justify-start text-left rounded-xl"
      variant="ghost"
      disabled={hasActiveNewChat && sessionId === null && messages.length === 0}
      title="Start a new chat"
    >
      <Plus className="h-4 w-4 mr-2" />
      New chat
    </Button>
  );

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
                  <MessageSquare className="h-4 w-4" /> Chats
                </SheetTitle>
              </SheetHeader>
              <div className="p-2 space-y-1">{newChatButton}</div>
            </SheetContent>
          </Sheet>

          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Memory Hub
            </h1>
            <span className="text-xs text-muted-foreground">{topic}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={handleReset}
            title="Clear conversation messages (keep session)"
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
            <MessageSquare className="h-4 w-4" /> Chats
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {newChatButton}
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
