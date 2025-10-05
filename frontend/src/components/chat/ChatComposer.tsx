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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border p-2.5 sm:p-4 bg-muted/30"
    >
      <div className="flex items-end gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="py-5 sm:py-6 text-base rounded-xl"
          disabled={disabled}
        />
        <Button
          type="submit"
          size="lg"
          className="px-4 rounded-xl bg-gradient-primary text-white"
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
