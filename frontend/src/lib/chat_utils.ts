import type { ApiChatItem } from "@/types/chat";

export function normalizeChatHistory(raw: unknown): ApiChatItem[] {
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
      const owner = ownerStr === "user" ? "user" : "assistant";
      return { id, created_at, text, owner, session_id } as ApiChatItem;
    })
    .filter((m: ApiChatItem) => typeof m.text === "string");
}
