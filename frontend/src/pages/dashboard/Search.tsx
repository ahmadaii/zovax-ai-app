import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Sparkles,
  Trash2,
  MessageSquare,
  Plus,
  RefreshCw,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { useTenant } from "@/contexts/TenantContext";
import MarkdownMessage from "@/components/MarkdownMessage";

/* ---------- Types ---------- */
type Role = "user" | "assistant";
type Variant = "normal" | "error" | "typing";

type Msg = { id: number; role: Role; content: string; variant?: Variant };

type ApiSession = {
  id?: string | number;
  session_id?: string | number;
  topic?: string;
  created_at?: string;
};

type ApiChatItem = {
  id: string | number;
  created_at?: string;
  text: string;
  owner: "user" | "assistant";
  session_id?: string | number;
};

type Session = { id: string; topic: string; createdAt?: string };

/* ---------- Endpoints ---------- */
const STREAM_URL =
  import.meta.env.VITE_API_BASE_URL + "/conversation/chat_response";
const SESSIONS_URL_BASE = "http://0.0.0.0:8000/session/";
const SESSION_CHAT_URL_BASE = "http://0.0.0.0:8000/session/chat/";
const SIGNIN_PATH = "/";

/* ====================================================================== */

export default function Search() {
  const { ready, user, token, signOut } = useTenant();
  const navigate = useNavigate();

  // UI state
  const [focusMode, setFocusMode] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Session | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [inFlight, setInFlight] = React.useState(false);

  // Conversation/session state
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [topic, setTopic] = React.useState<string>("Memory Hub");
  const [hasActiveNewChat, setHasActiveNewChat] = React.useState<boolean>(true);

  // Sessions list state
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);

  // Loader for GET /session/chat
  const [messagesLoading, setMessagesLoading] = React.useState(false);

  // Refs
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const activeAssistantMsgIdRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Helpers (track first user prompt & selection after new chat)
  const lastUserPromptRef = React.useRef<string | null>(null);
  const lastSendWasNewChatRef = React.useRef<boolean>(false);
  const forceSelectNewestRef = React.useRef<boolean>(false);

  const intro = {
    title: "Your Memory Hub Awaits",
    subtitle:
      "Search through your knowledge base, chat history, and documents to find exactly what you need.",
  };

  // 2-line clamp without needing the Tailwind plugin
  const titleClampStyle: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  /* ---------- Auth helper: sign out + redirect ---------- */
  const signOutAndRedirect = React.useCallback(() => {
    try {
      signOut();
    } catch {}
    setInFlight(false);
    setMessagesLoading(false);
    setSessionsLoading(false);
    navigate(SIGNIN_PATH, { replace: true });
  }, [signOut, navigate]);

  const isAuthError = (status: number) => status === 401 || status === 403;

  /* ---------- Auto-scroll ---------- */
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Message helpers ---------- */
  const appendMessage = React.useCallback(
    (role: Role, content: string, variant: Variant = "normal", id?: number) => {
      const msg: Msg = { id: id ?? Date.now(), role, content, variant };
      setMessages((prev) => [...prev, msg]);
      return msg.id;
    },
    []
  );

  function updateAssistantMessageContent(id: number, delta: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              variant: m.variant === "typing" && delta ? "normal" : m.variant,
              content: m.content + delta,
            }
          : m
      )
    );
  }

  function setMessageVariant(id: number, variant: Variant) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, variant } : m))
    );
  }

  /* ---------- API: Sessions list ---------- */
  const fetchSessions = React.useCallback(async (): Promise<Session[]> => {
    if (!ready || !user) return [];

    try {
      setSessionsLoading(true);
      setSessionsError(null);

      const url = new URL(SESSIONS_URL_BASE);
      url.searchParams.set("tenant_id", String(user.tenant_id ?? ""));
      url.searchParams.set("user_id", String(user.user_id));

      const resp = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (isAuthError(resp.status)) {
        signOutAndRedirect();
        return [];
      }
      if (!resp.ok)
        throw new Error(`Failed to fetch sessions (HTTP ${resp.status})`);

      const data: ApiSession[] = await resp.json();

      const normalized: Session[] = (Array.isArray(data) ? data : []).map(
        (s) => {
          const id = (s.session_id ?? s.id ?? "").toString();
          const t = (s.topic ?? "Untitled").toString();
          const createdAt = s.created_at
            ? new Date(s.created_at).toISOString()
            : undefined;
          return { id, topic: t, createdAt };
        }
      );

      const unique = Array.from(
        new Map(normalized.map((s) => [s.id, s])).values()
      );

      // newest -> oldest
      unique.sort((a, b) => {
        const at = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bt - at;
      });

      setSessions(unique);

      if (forceSelectNewestRef.current && unique.length > 0) {
        const newest = unique[0];
        setSessionId(newest.id);
        setTopic(newest.topic || "Untitled");
        forceSelectNewestRef.current = false;
      }

      return unique;
    } catch (e: any) {
      setSessionsError(e?.message || "Unable to load sessions.");
      setSessions([]);
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }, [ready, user, token, signOutAndRedirect]);

  /* ---------- API: Normalize chat history ---------- */
  function normalizeChatHistory(raw: unknown): ApiChatItem[] {
    const arr: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.messages)
      ? (raw as any).messages
      : [];

    return arr
      .map((m: any) => {
        const id = m?.id ?? `${Date.now()}-${Math.random()}`;
        const created_at: string | undefined =
          m?.created_at ?? m?.createdAt ?? undefined;
        const session_id = m?.session_id ?? m?.sessionId ?? undefined;
        const text: string = m?.text ?? m?.content ?? "";
        const ownerStr: string = (m?.owner ?? m?.role ?? "assistant")
          .toString()
          .toLowerCase();
        const owner: Role = ownerStr === "user" ? "user" : "assistant";
        return { id, created_at, text, owner, session_id } as ApiChatItem;
      })
      .filter((m: ApiChatItem) => typeof m.text === "string");
  }

  /* ---------- API: Chat history for a session ---------- */
  const fetchSessionMessages = React.useCallback(
    async (sid: string) => {
      if (!ready || !user || !sid) return;
      try {
        setMessagesLoading(true);

        const url = new URL(SESSION_CHAT_URL_BASE);
        url.searchParams.set("tenant_id", String(user.tenant_id ?? ""));
        url.searchParams.set("user_id", String(user.user_id));
        url.searchParams.set("session_id", String(sid));

        const resp = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (isAuthError(resp.status)) {
          signOutAndRedirect();
          return;
        }
        if (!resp.ok)
          throw new Error(`Failed to fetch chat history (HTTP ${resp.status})`);

        const raw = await resp.json();
        const data = normalizeChatHistory(raw);

        const ordered = [...data].sort((a, b) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return at - bt;
        });

        const mapped: Msg[] = ordered.map((m) => ({
          id: Number(m.id) || Date.now() + Math.random(),
          role: m.owner,
          content: m.text ?? "",
          variant: "normal",
        }));

        setMessages(mapped);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [ready, user, token, signOutAndRedirect]
  );

  /* ---------- Delete Session ---------- */
  async function deleteSessionById(sid: string) {
    if (!ready || !user) return;
    try {
      setDeleting(true);
      setDeleteError(null);

      const url = new URL(SESSIONS_URL_BASE);
      url.searchParams.set("tenant_id", String(user.tenant_id ?? ""));
      url.searchParams.set("user_id", String(user.user_id));
      url.searchParams.set("session_id", String(sid));

      const resp = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (isAuthError(resp.status)) {
        signOutAndRedirect();
        return;
      }
      if (!resp.ok) throw new Error(`Delete failed (HTTP ${resp.status})`);

      setSessions((prev) => prev.filter((s) => s.id !== sid));

      if (sessionId === sid) {
        hardResetConversationState();
      }
    } catch (e: any) {
      setDeleteError(e?.message || "Unable to delete session.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  /* ---------- Initial sessions load ---------- */
  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* ---------- Load history when a real sessionId is set ---------- */
  React.useEffect(() => {
    if (sessionId) {
      fetchSessions();
      fetchSessionMessages(sessionId);
    }
  }, [sessionId, fetchSessions, fetchSessionMessages]);

  /* ---------- Streaming logic (single assistant placeholder) ---------- */
  async function streamToFrontend(userText: string) {
    if (!ready || !token || !user) {
      signOutAndRedirect();
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setInFlight(true);

    try {
      const payload: Record<string, any> = {
        tenant_id: String(user.tenant_id ?? ""),
        user_id: String(user.user_id),
        message: userText,
        reset_context: false,
        session_id: sessionId ? String(sessionId) : null, // send null for a new chat
      };

      const resp = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (isAuthError(resp.status)) {
        signOutAndRedirect();
        return;
      }
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // one assistant placeholder
      activeAssistantMsgIdRef.current = appendMessage(
        "assistant",
        "",
        "typing"
      );
      const assistantId = activeAssistantMsgIdRef.current;

      const SEP = "###END###";
      let sawAnyTokens = false;

      const handleEvent = async (evt: any) => {
        const type = evt?.type as
          | "log"
          | "first_token"
          | "token"
          | "final_token"
          | "error"
          | undefined;

        if (type === "first_token") return;

        if (type === "token") {
          sawAnyTokens = true;
          if (assistantId != null) {
            updateAssistantMessageContent(assistantId, evt.content ?? "");
          }
          return;
        }

        if (type === "final_token") {
          if (!sawAnyTokens && evt?.content && assistantId != null) {
            updateAssistantMessageContent(assistantId, evt.content);
          }
          if (assistantId != null) setMessageVariant(assistantId, "normal");

          if (lastSendWasNewChatRef.current) {
            forceSelectNewestRef.current = true;

            const refreshed = await fetchSessions();
            if (refreshed.length > 0) {
              const newest = refreshed[0];
              setSessionId(newest.id);
              setTopic(newest.topic || "Untitled");

              // rename guess → first user prompt
              const raw = (lastUserPromptRef.current ?? "").trim();
              const topicGuess =
                raw.length <= 60 ? raw : raw.slice(0, 57).trimEnd() + "…";
              const safeTopic = topicGuess || "New chat";

              setSessions((prev) =>
                prev.map((x) =>
                  x.id === newest.id ? { ...x, topic: safeTopic } : x
                )
              );
              setTopic(safeTopic);
            }

            lastSendWasNewChatRef.current = false;
          }
          return;
        }

        if (type === "error") {
          if (assistantId != null) setMessageVariant(assistantId, "error");
          else
            appendMessage(
              "assistant",
              `⚠️ ${evt?.content || "An unexpected error occurred."}`,
              "error"
            );
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf(SEP)) !== -1) {
          const raw = buffer.slice(0, sepIndex).trim();
          buffer = buffer.slice(sepIndex + SEP.length);
          if (buffer.startsWith("\n")) buffer = buffer.slice(1);
          if (!raw) continue;

          try {
            const evt = JSON.parse(raw);
            await handleEvent(evt);
          } catch {
            /* ignore */
          }
        }
      }

      const tail = buffer.trim();
      if (tail) {
        try {
          const evt = JSON.parse(tail);
          await handleEvent(evt);
        } catch {
          /* ignore */
        }
      }

      if (activeAssistantMsgIdRef.current != null) {
        setMessageVariant(activeAssistantMsgIdRef.current, "normal");
      }
    } catch {
      if (activeAssistantMsgIdRef.current != null) {
        setMessageVariant(activeAssistantMsgIdRef.current, "error");
      } else {
        appendMessage(
          "assistant",
          "⚠️ Stream interrupted. Please try again.",
          "error"
        );
      }
    } finally {
      setInFlight(false);
      abortRef.current = null;
    }
  }

  /* ---------- UI handlers ---------- */
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || inFlight) return;

    appendMessage("user", trimmed);
    setInput("");

    lastUserPromptRef.current = trimmed;
    lastSendWasNewChatRef.current = sessionId === null;

    await streamToFrontend(trimmed);
  };

  const hardResetConversationState = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;

    setSessionId(null);
    setTopic("Memory Hub");
    setHasActiveNewChat(true);
  };

  const handleNewChat = () => {
    if (hasActiveNewChat && sessionId === null) return;
    hardResetConversationState();
  };

  const handleOpenSession = (s: Session) => {
    if (!s?.id) return;
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;

    setSessionId(s.id);
    setTopic(s.topic || "Untitled");
    setHasActiveNewChat(false);

    fetchSessionMessages(s.id);
  };

  /* ---------- Sidebar content (chats list) ---------- */
  const sessionsList = (
    <div className="min-w-0">
      {/* Header (single) */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-border bg-muted/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-foreground/80" />
          <span className="text-sm font-semibold tracking-wide text-foreground/80">
            Chats
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          {/* <Button
            size="icon"
            variant="ghost"
            onClick={fetchSessions}
            title="Refresh"
            disabled={sessionsLoading}
            className="rounded-lg"
          >
            <RefreshCw
              className={`h-4 w-4 ${sessionsLoading ? "animate-spin" : ""}`}
            />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hidden md:inline-flex h-10 w-10"
            title={focusMode ? "Show Chats sidebar" : "Hide Chats sidebar"}
            onClick={() => setFocusMode((v) => !v)}
          >
            {focusMode ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pt-3 pb-2 text-xs text-muted-foreground">
        Your sessions
      </div>

      <div className="px-3">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start text-left rounded-xl border border-dashed border-border bg-background hover:bg-muted/60 hover:text-foreground"
          variant="ghost"
          disabled={hasActiveNewChat && sessionId === null}
          title="Start a new chat"
        >
          <Plus className="h-4 w-4 mr-2" />
          New chat
        </Button>

        {sessionsError && (
          <div className="mt-2 text-xs text-red-600 px-2 py-1 rounded-md bg-red-50 border border-red-200">
            {sessionsError}
          </div>
        )}
        {sessionsLoading && !sessions.length && (
          <div className="mt-2 text-xs text-muted-foreground px-2 py-1">
            Loading sessions…
          </div>
        )}
        {!sessionsLoading && sessions.length === 0 && (
          <div className="mt-2 text-xs text-muted-foreground px-2 py-1">
            No saved sessions yet.
          </div>
        )}
      </div>

      {/* List */}
      <ul className="px-2 pt-1 pb-3 space-y-1.5">
        {sessions.map((s) => {
          const isActive = sessionId === s.id;
          const rowBase =
            "group w-full rounded-lg px-3 py-1 flex items-center gap-1 min-w-0 cursor-pointer " +
            "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
          const rowState = isActive
            ? "bg-primary/10 ring-1 ring-primary/20"
            : "hover:bg-muted/60";

          return (
            <li key={s.id} className="min-w-0">
              {/* Row is a div (not Button) so we can have a delete Button inside without nesting buttons */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleOpenSession(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleOpenSession(s);
                }}
                className={`${rowBase} ${rowState}`}
              >
                {/* Title */}
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                  {s.topic || "Untitled"}
                </span>

                {/* Delete (only visible on hover or when active) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-md p-1.5 text-muted-foreground transition
                              ${
                                isActive
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }
                              hover:bg-red-600/10 hover:text-red-600`}
                  title="Delete chat"
                  aria-label={`Delete chat ${s.topic || "Untitled"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(s);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {/* Delete dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          // prevent closing while deleting
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>

            <AlertDialogDescription className="text-muted-foreground max-w-[38rem]">
              <span>
                You're about to delete this chat. This action is irreversible.
              </span>

              {deleteError && (
                <div className="mt-2 text-sm text-red-600">{deleteError}</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || !deleteTarget?.id}
              onClick={() => {
                if (deleteTarget?.id) deleteSessionById(deleteTarget.id);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  /* ---------- Render ---------- */
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile drawer trigger (opens Chats) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl"
                title="Open Chats"
              >
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
              {sessionsList}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Memory Hub
            </h1>
          </div>
        </div>
      </div>

      {/* Unified container */}
      <div className="relative flex h-[75vh] sm:h-[72vh] rounded-2xl shadow-md overflow-hidden border border-border min-w-0 bg-background">
        {/* Floating show-chats pill (desktop) */}
        {focusMode && (
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="hidden md:flex items-center gap-2 absolute left-3 top-3 z-10
                       rounded-lg border border-border bg-background/85 backdrop-blur px-2.5 py-1.5
                       text-xs shadow-sm hover:bg-background"
            title="Show Chats sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
            Show Chats
          </button>
        )}

        {/* Sidebar (hidden on phones; collapsible on desktop) */}
        <div
          className={`hidden md:flex bg-muted/40 flex-col transition-[width] duration-200 ease-in-out overflow-hidden
            ${
              focusMode
                ? "md:w-0 md:border-r-0 md:pointer-events-none"
                : "md:w-64 md:border-r md:border-border"
            }`}
          aria-hidden={focusMode}
        >
          <div className="flex-1 overflow-y-auto">{sessionsList}</div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
          {/* Messages */}
          <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            {messagesLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-foreground/40 border-t-transparent animate-spin" />
              </div>
            )}

            {messages.length === 0 && !messagesLoading && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <Sparkles className="mb-3 h-8 w-8 text-primary/80" />
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground/80">
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
                  `min-w-0 ${
                    focusMode ? "max-w-full" : "max-w-[90%] sm:max-w-[85%]"
                  } ` +
                  "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm overflow-hidden";
                const style =
                  m.variant === "error"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : m.role === "user"
                    ? "bg-gradient-primary text-white"
                    : "bg-muted text-foreground";
                const align =
                  m.role === "user" ? "justify-end" : "justify-start";
                const typing =
                  m.role === "assistant" &&
                  m.variant === "typing" &&
                  !m.content;

                return (
                  <li key={m.id} className={`flex ${align} min-w-0`}>
                    <div className={`${base} ${style}`}>
                      {typing && !m.content ? (
                        <span className="inline-flex items-center gap-2">
                          {/* <span>Assistant is typing</span> */}
                          <span className="flex gap-1">
                            <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:0ms]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:120ms]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-foreground/60 [animation-delay:240ms]" />
                          </span>
                        </span>
                      ) : (
                        <MarkdownMessage
                          text={m.content}
                          streaming={m.variant === "typing"}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            className="border-t border-border p-2.5 sm:p-4 bg-muted/30"
          >
            <div className="flex items-end gap-2">
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
                title="Send"
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
