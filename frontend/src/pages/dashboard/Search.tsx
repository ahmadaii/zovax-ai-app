import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.tsx";

export default function Search() {
  const [messages, setMessages] = useState<
    Array<{ id: number; role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Dummy chat history list
  const dummyChats = [
    { id: 101, title: "Product Installation Guide" },
    { id: 102, title: "Customer Support Templates" },
    { id: 103, title: "API Integration Help" },
    { id: 104, title: "Billing and Pricing jdewhuiogr fugewighuogbrvew fgewuifgew" },
    { id: 105, title: "Feature Updates" },
  ];

  const intro = {
    title: "Your Memory Hub Awaits",
    subtitle:
      "Search through your knowledge base, chat history, and documents to find exactly what you need.",
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), role: "user" as const, content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setIsTyping(true);
    setTimeout(() => {
      const reply = {
        id: Date.now() + 1,
        role: "assistant" as const,
        content:
          "This is a test response. I received your message and the backend wiring can be added next.",
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 450);
  };

  const handleClear = () => {
    setMessages([]);
    setInput("");
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
                    className="w-full justify-start text-left rounded-xl hover:bg-gradient-primary/10"
                  >
                    {chat.title}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Memory Hub
          </h1>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gap-2 text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        )}
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
                className="w-full justify-start text-left rounded-xl hover:bg-gradient-primary/10"
              >
                {chat.title}
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
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={
                      "max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm whitespace-pre-wrap break-words " +
                      (m.role === "user"
                        ? "bg-gradient-primary text-white"
                        : "bg-muted text-foreground")
                    }
                  >
                    {m.content}
                  </div>
                </li>
              ))}

              {isTyping && (
                <li className="flex justify-start">
                  <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl bg-muted px-3 sm:px-4 py-2.5 sm:py-3 text-sm shadow-sm">
                    <span className="inline-flex items-center gap-2">
                      <span>Assistant is typing</span>
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
              />
              <Button
                type="submit"
                size="lg"
                className="px-4 rounded-xl bg-gradient-primary text-white"
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
