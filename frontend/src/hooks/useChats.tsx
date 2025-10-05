import * as React from "react";
import type { Msg, Role, Variant, Session } from "@/types/chat";
import { v4 as uuidv4 } from "uuid";
import {
  fetchSessionsApi,
  fetchSessionMessagesApi,
  deleteSessionApi,
  isAuthError,
  streamChatApi,
  savePartialApi,
} from "@/lib/api";

export function useChat({
  ready,
  user,
  token,
  onAuthError,
}: {
  ready: boolean;
  user: any;
  token?: string;
  onAuthError: () => void;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [inFlight, setInFlight] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [topic, setTopic] = React.useState<string>("Memory Hub");
  const [hasActiveNewChat, setHasActiveNewChat] = React.useState<boolean>(true);

  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = React.useState(false);

  const activeAssistantMsgIdRef = React.useRef<number | null>(null);
  const activeAssistantTextRef = React.useRef<string>("");
  const abortRef = React.useRef<AbortController | null>(null);
  const lastUserPromptRef = React.useRef<string | null>(null);
  const lastSendWasNewChatRef = React.useRef<boolean>(false);
  const forceSelectNewestRef = React.useRef<boolean>(false);
  const activeClientReqIdRef = React.useRef<string | null>(null);

  const sessionIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // --- FIX: guaranteed-unique message IDs (no Date.now() collisions)
  const idSeq = React.useRef(1);
  const nextId = React.useCallback(() => {
    idSeq.current += 1;
    return idSeq.current;
  }, []);

  const appendMessage = React.useCallback(
    (role: Role, content: string, variant: Variant = "normal", id?: number) => {
      const msg: Msg = { id: id ?? nextId(), role, content, variant };
      setMessages((prev) => [...prev, msg]);
      return msg.id;
    },
    [nextId]
  );

  const savePartialIfNeeded = React.useCallback(
    async (reason = "client_abort") => {
      if (!inFlight || !token || !user) return;
      const sidStr = sessionIdRef.current;
      if (!sidStr) return;
      const sid = Number(sidStr);
      const reqId = activeClientReqIdRef.current;
      if (!reqId) return;
      const partial = activeAssistantTextRef.current.trim();
      if (!partial) return;
      const tail = "\n\n> **⚠️ Conversation interrupted**  \n>";
      try {
        await savePartialApi({
          token,
          sessionId: sid,
          message: partial + tail,
          clientReqId: reqId,
          reason,
        });
      } catch {}
    },
    [inFlight, token, user]
  );

  const updateAssistantMessageContent = (id: number, delta: string) => {
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
    if (id === activeAssistantMsgIdRef.current && delta) {
      activeAssistantTextRef.current += delta;
    }
  };
  const setMessageVariant = (id: number, variant: Variant) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, variant } : m))
    );
  };

  const hardResetConversationState = React.useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInFlight(false);
    activeAssistantMsgIdRef.current = null;
    setSessionId(null);
    setTopic("Memory Hub");
    setHasActiveNewChat(true);
  }, []);

  const fetchSessions = React.useCallback(async () => {
    if (!ready || !user) return [] as Session[];
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const data = await fetchSessionsApi({
        tenantId: String(user.tenant_id ?? ""),
        userId: String(user.user_id),
        token,
      });
      setSessions(data);
      if (forceSelectNewestRef.current && data.length > 0) {
        const newest = data[0];
        setSessionId(newest.id);
        setTopic(newest.topic || "Untitled");
        forceSelectNewestRef.current = false;
      }
      return data;
    } catch (e: any) {
      if (isAuthError(e?.status)) onAuthError();
      setSessionsError(e?.message || "Unable to load sessions.");
      setSessions([]);
      return [] as Session[];
    } finally {
      setSessionsLoading(false);
    }
  }, [ready, user, token, onAuthError]);

  const fetchSessionMessages = React.useCallback(
    async (sid: string) => {
      if (!ready || !user || !sid) return;
      try {
        setMessagesLoading(true);
        const mapped = await fetchSessionMessagesApi({
          tenantId: String(user.tenant_id ?? ""),
          userId: String(user.user_id),
          sessionId: sid,
          token,
        });
        setMessages(mapped);
      } catch (e: any) {
        if (isAuthError(e?.status)) onAuthError();
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [ready, user, token, onAuthError]
  );

  const deleteSessionById = React.useCallback(
    async (sid: string) => {
      if (!ready || !user) return;
      try {
        await deleteSessionApi({
          tenantId: String(user.tenant_id ?? ""),
          userId: String(user.user_id),
          sessionId: sid,
          token,
        });
        setSessions((prev) => prev.filter((s) => s.id !== sid));
        if (sessionId === sid) hardResetConversationState();
      } catch (e: any) {
        throw e;
      }
    },
    [ready, user, token, sessionId, hardResetConversationState]
  );

  const streamToFrontend = React.useCallback(
    async (userText: string) => {
      if (!ready || !token || !user) {
        onAuthError();
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setInFlight(true);
      // new request id for idempotency between stream & partial-save
      const clientReqId = globalThis.crypto?.randomUUID?.() || uuidv4();
      activeClientReqIdRef.current = clientReqId;
      activeAssistantTextRef.current = "";

      controller.signal.addEventListener(
        "abort",
        () => {
          void savePartialIfNeeded("client_abort");
        },
        { once: true }
      );

      let getAssistantText = () =>
        activeAssistantMsgIdRef.current != null
          ? messages.find((m) => m.id === activeAssistantMsgIdRef.current)
              ?.content ?? ""
          : "";

      try {
        // one assistant placeholder (unique id)
        activeAssistantMsgIdRef.current = appendMessage(
          "assistant",
          "",
          "typing"
        );
        const assistantId = activeAssistantMsgIdRef.current;
        let sawAnyTokens = false;

        // IMPORTANT: attach abort listener BEFORE starting the fetch
        controller.signal.addEventListener(
          "abort",
          () => {
            // fire-and-forget partial save
            void savePartialIfNeeded("client_abort");
          },
          { once: true }
        );

        const onEvent = async (evt: any) => {
          const type = evt?.type as
            | "session"
            | "log"
            | "token"
            | "final_token"
            | "cancelled"
            | "error"
            | "first_token"
            | undefined;
          if (type === "session") {
            const sid = String(evt.session_id);
            setSessionId(sid);
            setHasActiveNewChat(false);
            controller.signal.addEventListener(
              "abort",
              () => {
                void savePartialIfNeeded("client_abort");
              },
              { once: true }
            );
            return;
          }
          if (type === "first_token") return;
          if (type === "token") {
            sawAnyTokens = true;
            if (assistantId != null)
              updateAssistantMessageContent(assistantId, evt.content ?? "");
            return;
          }
          if (type === "final_token") {
            if (!sawAnyTokens && evt?.content && assistantId != null)
              updateAssistantMessageContent(assistantId, evt.content);
            if (assistantId != null) setMessageVariant(assistantId, "normal");
            // done: clear active ids/buffers so no more partial saves
            activeClientReqIdRef.current = null;
            activeAssistantTextRef.current = "";
            if (lastSendWasNewChatRef.current) {
              forceSelectNewestRef.current = true;
              const refreshed = await fetchSessions();
              if (refreshed.length > 0) {
                const newest = refreshed[0];
                setSessionId(newest.id);
                setTopic(newest.topic || "Untitled");
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
            activeClientReqIdRef.current = null;
            activeAssistantTextRef.current = "";
          }
        };

        await streamChatApi({
          tenantId: String(user.tenant_id ?? ""),
          userId: String(user.user_id),
          token,
          sessionId,
          text: userText,
          clientReqId,
          signal: controller.signal,
          onEvent,
        });

        if (activeAssistantMsgIdRef.current != null)
          setMessageVariant(activeAssistantMsgIdRef.current, "normal");
      } catch (e: any) {
        if (isAuthError(e?.status)) onAuthError();
        if (activeAssistantMsgIdRef.current != null)
          setMessageVariant(activeAssistantMsgIdRef.current, "error");
        else
          appendMessage(
            "assistant",
            "⚠️ Stream interrupted. Please try again.",
            "error"
          );
      } finally {
        setInFlight(false);
        abortRef.current = null;
      }
      +(
        // Register a one-time “onAbort” saver
        controller.signal.addEventListener(
          "abort",
          async () => {
            // only save if we actually have a session and some assistant text
            if (!sessionId) return;
            const partial = getAssistantText().trim();
            if (!partial) return;
            // append the attractive markdown tail NOTE (rendered as markdown in your UI)
            const interruptedTail =
              "\n\n> **⚠️ Conversation interrupted**  \n>";
            try {
              await savePartialApi({
                token,
                sessionId,
                message: partial + interruptedTail,
                clientReqId,
                reason: "client_abort",
              });
            } catch {}
          },
          { once: true }
        )
      );
    },
    [appendMessage, ready, token, user, sessionId, fetchSessions, onAuthError]
  );

  const send = React.useCallback(
    async (text: string) => {
      if (!text.trim() || inFlight) return;
      appendMessage("user", text.trim()); // unique id prevents overlap
      lastUserPromptRef.current = text.trim();
      lastSendWasNewChatRef.current = sessionId === null;
      await streamToFrontend(text.trim());
    },
    [appendMessage, inFlight, sessionId, streamToFrontend]
  );

  const newChat = React.useCallback(() => {
    if (hasActiveNewChat && sessionId === null) return;
    // if streaming, save partial + abort
    if (inFlight && abortRef.current) {
      void savePartialIfNeeded("navigate");
      abortRef.current.abort();
    }
    hardResetConversationState();
  }, [
    hasActiveNewChat,
    sessionId,
    hardResetConversationState,
    inFlight,
    savePartialIfNeeded,
  ]);

  const openSession = React.useCallback(
    (s: Session) => {
      if (!s?.id) return;
      if (inFlight && abortRef.current) {
        void savePartialIfNeeded("navigate");
        abortRef.current.abort();
      }
      setMessages([]);
      setInFlight(false);
      activeAssistantMsgIdRef.current = null;
      setSessionId(s.id);
      setTopic(s.topic || "Untitled");
      setHasActiveNewChat(false);
      fetchSessionMessages(s.id);
    },
    [inFlight, savePartialIfNeeded, fetchSessionMessages]
  );

  return {
    // state
    messages,
    inFlight,
    sessionId,
    topic,
    hasActiveNewChat,
    sessions,
    sessionsLoading,
    sessionsError,
    messagesLoading,
    // ops
    send,
    newChat,
    openSession,
    fetchSessions,
    fetchSessionMessages,
    deleteSessionById,
    // setters/helpers
    setMessages,
    setTopic,
    setSessions,
    setHasActiveNewChat,
  };
}
