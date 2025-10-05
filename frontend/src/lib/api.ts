// src/lib/api.ts
import {
  PARTIAL_STREAM_URL,
  STREAM_URL,
  SESSIONS_URL_BASE,
  SESSION_CHAT_URL_BASE,
} from "@/lib/endpoints";
import { normalizeChatHistory } from "@/lib/chat_utils";
import type { ApiSession, Session, Msg, Role } from "@/types/chat";

/** Generic HTTP helper used by TenantContext (and anywhere else) */
export async function api<T>(
  path: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    token?: string;
    signal?: AbortSignal;
    baseUrl?: string; // override base if needed
  } = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const {
    method = "GET",
    headers = {},
    body,
    token,
    signal,
    baseUrl = import.meta.env.VITE_API_BASE_URL,
  } = opts;

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${baseUrl}${path}`;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body:
        typeof body === "string"
          ? body
          : body
          ? JSON.stringify(body)
          : undefined,
      signal,
    });

    const status = res.status;
    const ct = res.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json");

    if (!res.ok) {
      let error: string | undefined;
      if (isJSON) {
        const j = await res.json().catch(() => null);
        error = j?.error || j?.message || `Request failed (HTTP ${status})`;
      } else {
        const t = await res.text().catch(() => "");
        error = t || `Request failed (HTTP ${status})`;
      }
      return { ok: false, status, error };
    }

    const data = (isJSON ? await res.json() : await res.text()) as T;
    return { ok: true, status, data };
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      error: e?.message || "Network error",
    };
  }
}

/** Small utility used elsewhere */
export const isAuthError = (status: number) => status === 401 || status === 403;

/* =================== Chat/session helpers (named exports) =================== */

export async function fetchSessionsApi({
  tenantId,
  userId,
  token,
}: {
  tenantId: string;
  userId: string;
  token?: string;
}) {
  const url = new URL(SESSIONS_URL_BASE);
  url.searchParams.set("tenant_id", tenantId);
  url.searchParams.set("user_id", userId);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!resp.ok) {
    const err: any = new Error(
      `Failed to fetch sessions (HTTP ${resp.status})`
    );
    err.status = resp.status;
    throw err;
  }

  const data: ApiSession[] = await resp.json();

  const normalized: Session[] = (Array.isArray(data) ? data : []).map((s) => {
    const id = (s.session_id ?? s.id ?? "").toString();
    const t = (s.topic ?? "Untitled").toString();
    const createdAt = s.created_at
      ? new Date(s.created_at).toISOString()
      : undefined;
    return { id, topic: t, createdAt };
  });

  const unique = Array.from(new Map(normalized.map((s) => [s.id, s])).values());
  unique.sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    return bt - at;
  });

  return unique;
}

export async function fetchSessionMessagesApi({
  tenantId,
  userId,
  sessionId,
  token,
}: {
  tenantId: string;
  userId: string;
  sessionId: string;
  token?: string;
}) {
  const url = new URL(SESSION_CHAT_URL_BASE);
  url.searchParams.set("tenant_id", tenantId);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("session_id", sessionId);

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!resp.ok) {
    const err: any = new Error(
      `Failed to fetch chat history (HTTP ${resp.status})`
    );
    err.status = resp.status;
    throw err;
  }

  const raw = await resp.json();
  const data = normalizeChatHistory(raw);

  const ordered = [...data].sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return at - bt;
  });

  const mapped: Msg[] = ordered.map((m) => ({
    id: Number(m.id) || Date.now() + Math.random(),
    role: m.owner as Role,
    content: m.text ?? "",
    variant: "normal",
  }));

  return mapped;
}

export async function deleteSessionApi({
  tenantId,
  userId,
  sessionId,
  token,
}: {
  tenantId: string;
  userId: string;
  sessionId: string;
  token?: string;
}) {
  const url = new URL(SESSIONS_URL_BASE);
  url.searchParams.set("tenant_id", tenantId);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("session_id", sessionId);

  const resp = await fetch(url.toString(), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!resp.ok) {
    const err: any = new Error(`Delete failed (HTTP ${resp.status})`);
    err.status = resp.status;
    throw err;
  }
}

export async function streamChatApi({
  tenantId,
  userId,
  token,
  sessionId,
  text,
  clientReqId,
  signal,
  onEvent,
}: {
  tenantId: string;
  userId: string;
  token: string;
  sessionId: string | null;
  text: string;
  clientReqId: string;
  signal: AbortSignal;
  onEvent: (evt: any) => Promise<void> | void;
}) {
  const payload: Record<string, any> = {
    tenant_id: tenantId,
    user_id: userId,
    message: text,
    reset_context: false,
    session_id: sessionId ? String(sessionId) : null,
    client_req_id: clientReqId,
  };

  const resp = await fetch(STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const err: any = new Error(`HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const headerSid = resp.headers.get("X-Session-Id");
  if (headerSid) {
    await onEvent({ type: "session", session_id: Number(headerSid) });
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const SEP = "###END###";

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
        await onEvent(JSON.parse(raw));
      } catch {
        /* ignore bad chunks */
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      await onEvent(JSON.parse(tail));
    } catch {
      /* ignore */
    }
  }
}

export async function savePartialApi({
  token,
  sessionId,
  message,
  clientReqId,
  reason = "client_abort",
}: {
  token: string;
  sessionId: number;
  message: string;
  clientReqId: string;
  reason?: string;
}) {
  const resp = await fetch(PARTIAL_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      client_req_id: clientReqId,
      reason,
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/** Optional grouped export for chat helpers (avoid name clash with api<T> function) */
export const chatApi = {
  isAuthError,
  fetchSessions: fetchSessionsApi,
  fetchSessionMessages: fetchSessionMessagesApi,
  deleteSession: deleteSessionApi,
  streamChat: streamChatApi,
};

export default api;
