import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [input, setInput] = React.useState("");
  const prevScrollRef = React.useRef(0);
  const bodyOverflowRef = React.useRef<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  const handleFocus = () => {
    // Save current page scroll so we can restore after keyboard closes
    prevScrollRef.current = window.scrollY || window.pageYOffset;
    // Lock body scroll to keep page from moving while keyboard is open
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  };

  const restoreScroll = React.useCallback(() => {
    // Restore body scroll and previous scroll position (iOS Safari often fails to auto-restore)
    document.body.style.overflow = bodyOverflowRef.current || "";
    // Multiple attempts to combat iOS timing quirks
    const target = prevScrollRef.current;
    [0, 50, 120].forEach((delay) => {
      setTimeout(() => {
        window.scrollTo({ top: target, behavior: "auto" });
      }, delay);
    });
  }, []);

  const handleBlur = () => {
    restoreScroll();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border p-2.5 sm:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky bottom-0"
    >
      <div className="flex flex-col xs:flex-row items-stretch xs:items-end gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          // iOS Safari zooms when focused input font-size <16px; force base >=16px
          className="py-3 sm:py-5 text-base rounded-xl flex-1 w-full"
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          inputMode="text"
        />
        <Button
          type="submit"
          size="lg"
          className="px-4 rounded-xl bg-gradient-primary text-white w-full xs:w-auto h-11"
          disabled={disabled}
          title="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

export default ChatComposer;
