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
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { SIGNIN_PATH } from "@/lib/endpoints";
import { useChat } from "@/hooks/useChats";
import type { RecentSearch } from "@/components/search/RecentSearches";
import { RecentSearches } from "@/components/search/RecentSearches";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatsSidebar } from "@/components/sidebar/ChatsSidebar";
import { Menu } from "lucide-react";

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
    hasActiveNewChat,
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
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  React.useEffect(() => {
    if (sessionId) fetchSessions();
  }, [sessionId, fetchSessions]);

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
    <div className="mx-auto max-w-6xl space-y-6 p-3 sm:p-6">
      {/* Chat / Memory Hub Card */}
      <Card>
        <CardHeader className="p-3 pb-2 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Mobile conversation history trigger */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-lg h-9 w-9"
                    title="Open conversations"
                    aria-label="Open conversations"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  hideClose
                  className="p-0 border-r border-border bg-sidebar flex flex-col w-[18rem] max-w-[90vw]"
                >
                  <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                        ZOVAX
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      title="Close chats sidebar"
                      aria-label="Close chats sidebar"
                      onClick={() => setMobileSheetOpen(false)}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <ChatsSidebar
                      mobile
                      focusMode={false}
                      setFocusMode={() => {}}
                      sessions={sessions}
                      sessionsLoading={sessionsLoading}
                      sessionsError={sessionsError}
                      sessionId={sessionId}
                      onNewChat={() => {
                        newChat();
                        setMobileSheetOpen(false);
                      }}
                      onOpenSession={(s) => {
                        openSession(s);
                        setMobileSheetOpen(false);
                      }}
                      onDeleteSession={deleteSessionById}
                      newChatDisabled={newChatDisabled}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Chat Interface */}
          <div className="relative flex h-[60vh] xs:h-[64vh] sm:h-[68vh] md:h-[70vh] min-h-[480px]">
            {focusMode && (
              <button
                type="button"
                onClick={() => setFocusMode(false)}
                className="hidden md:inline-flex items-center gap-1.5 absolute left-2 top-2 z-30 bg-background/95 backdrop-blur border border-border rounded-full px-3 py-1.5 text-xs shadow-sm hover:bg-background"
                title="Show Chats sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
                Chats
              </button>
            )}
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
              newChatDisabled={newChatDisabled}
            />
            <div className="flex-1 flex flex-col bg-background min-w-0 border-l md:border-l-0">
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
        </CardContent>
      </Card>

      {/* Recent Searches Card */}
      <RecentSearches
        items={recentSearches}
        onDelete={handleDeleteSearch}
        onView={handleViewSearch}
      />
    </div>
  );
}
