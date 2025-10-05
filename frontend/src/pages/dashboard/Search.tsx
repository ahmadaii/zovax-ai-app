import * as React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTenant } from "@/contexts/TenantContext";
import { SIGNIN_PATH } from "@/lib/endpoints";
import { useChat } from "@/hooks/useChats";
import type { RecentSearch } from "@/components/search/RecentSearches";
import { RecentSearches } from "@/components/search/RecentSearches";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatsSidebar } from "@/components/sidebar/ChatsSidebar";

export default function Search() {
  const { ready, user, token, signOut } = useTenant();
  const navigate = useNavigate();

  const onAuthError = React.useCallback(() => {
    try {
      signOut();
    } catch {}
    navigate(SIGNIN_PATH, { replace: true });
  }, [signOut, navigate]);

  const {
    messages,
    inFlight,
    sessionId,
    topic,
    hasActiveNewChat, // NEW: use to disable button
    sessions,
    sessionsLoading,
    sessionsError,
    messagesLoading,
    send,
    newChat,
    openSession,
    fetchSessions,
    deleteSessionById,
  } = useChat({ ready, user, token, onAuthError });

  const [focusMode, setFocusMode] = React.useState(false);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  React.useEffect(() => {
    if (sessionId) fetchSessions();
  }, [sessionId, fetchSessions]);

  // Mock recent searches (replace with real data when backend is ready)
  const mockRecentSearches: RecentSearch[] = [
    {
      id: 1,
      chatTitle: "Product Installation Guide",
      date: "2024-01-15",
      searchQuery: "how to install whatsapp bot",
      status: "completed",
    },
    {
      id: 2,
      chatTitle: "Customer Support Templates",
      date: "2024-01-14",
      searchQuery: "customer service responses",
      status: "completed",
    },
    {
      id: 3,
      chatTitle: "API Integration Help",
      date: "2024-01-13",
      searchQuery: "API webhook setup",
      status: "completed",
    },
    {
      id: 4,
      chatTitle: "Billing and Pricing",
      date: "2024-01-12",
      searchQuery: "subscription plans pricing",
      status: "completed",
    },
    {
      id: 5,
      chatTitle: "Feature Updates",
      date: "2024-01-11",
      searchQuery: "new features changelog",
      status: "completed",
    },
  ];
  const [recentSearches, setRecentSearches] =
    React.useState<RecentSearch[]>(mockRecentSearches);

  const handleViewSearch = (id: number) =>
    navigate(`/dashboard/search/results/${id}`);
  const handleDeleteSearch = (id: number) =>
    setRecentSearches((prev) => prev.filter((s) => s.id !== id));

  const intro = {
    title: "Your Memory Hub Awaits",
    subtitle:
      "Search through your knowledge base, chat history, and documents to find exactly what you need.",
  };

  const newChatDisabled = hasActiveNewChat && sessionId === null;

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
              <div className="flex-1 overflow-y-auto">
                <ChatsSidebar
                  focusMode={false}
                  setFocusMode={() => {}}
                  sessions={sessions}
                  sessionsLoading={sessionsLoading}
                  sessionsError={sessionsError}
                  sessionId={sessionId}
                  onNewChat={newChat}
                  onOpenSession={openSession}
                  onDeleteSession={deleteSessionById}
                  newChatDisabled={newChatDisabled} // NEW
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {"Memory Hub"}
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
        <ChatsSidebar
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          sessionsError={sessionsError}
          sessionId={sessionId}
          onNewChat={newChat}
          onOpenSession={openSession}
          onDeleteSession={deleteSessionById}
          newChatDisabled={newChatDisabled} // NEW
        />

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
          <ChatMessages
            messages={messages}
            loading={messagesLoading}
            focusMode={focusMode}
            intro={intro}
          />
          <ChatComposer
            onSend={(text) => {
              window.dispatchEvent(new CustomEvent("chat:messageSent"));
              send(text);
            }}
            disabled={inFlight}
          />
        </div>
      </div>

      <RecentSearches
        items={recentSearches}
        onDelete={handleDeleteSearch}
        onView={handleViewSearch}
      />
    </div>
  );
}
