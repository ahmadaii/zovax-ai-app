import * as React from "react";
import type { Msg } from "@/types/chat";
import { Sparkles } from "lucide-react";
import MarkdownMessage from "@/components/MarkdownMessage";

export function ChatMessages({
  messages,
  loading,
  focusMode,
  intro,
}: {
  messages: Msg[];
  loading: boolean;
  focusMode: boolean;
  intro: { title: string; subtitle: string };
}) {
  // SCROLL FIX: scroll only inside this element
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = React.useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mobile keyboard handling: when keyboard closes visualViewport height grows -> scroll bottom
  React.useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    if (!vv) return; // older browsers
    let lastHeight = vv.height;
    const THRESHOLD = 60; // px change to treat as keyboard close
    const onResize = () => {
      const increased = vv.height - lastHeight;
      if (increased > THRESHOLD) {
        // keyboard likely closed
        requestAnimationFrame(() => scrollToBottom(false));
      }
      lastHeight = vv.height;
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  // Fallback: on window blur/focusout (input loses focus) schedule scroll
  React.useEffect(() => {
    const onFocusOut = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        setTimeout(() => scrollToBottom(false), 80);
      }
    };
    window.addEventListener("focusout", onFocusOut, true);
    return () => window.removeEventListener("focusout", onFocusOut, true);
  }, [scrollToBottom]);

  React.useEffect(() => {
    // Existing visualViewport + focusout logic kept.
    const restoreOnCustom = () => scrollToBottom(false);
    window.addEventListener("chat:restoreScroll", restoreOnCustom);
    return () =>
      window.removeEventListener("chat:restoreScroll", restoreOnCustom);
  }, [scrollToBottom]);

  return (
    <div
      ref={scrollRef}
      className="relative flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-6 h-full pb-24"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-foreground/40 border-t-transparent animate-spin" />
        </div>
      )}

      {messages.length === 0 && !loading && (
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
              focusMode
                ? "max-w-full"
                : "max-w-[95%] xs:max-w-[90%] sm:max-w-[85%]"
            } ` +
            "rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm overflow-hidden";
          const style =
            m.variant === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : m.role === "user"
              ? "bg-gradient-primary text-white"
              : "bg-muted text-foreground";
          const align = m.role === "user" ? "justify-end" : "justify-start";
          const typing =
            m.role === "assistant" && m.variant === "typing" && !m.content;

          return (
            <li key={m.id} className={`flex ${align} min-w-0`}>
              <div className={`${base} ${style}`}>
                {typing ? (
                  <span className="inline-flex items-center gap-2">
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
    </div>
  );
}

export default ChatMessages;
