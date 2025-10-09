import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  Trash2,
  Menu,
} from "lucide-react";
import type { Session } from "@/types/chat";

export function ChatsSidebar({
  focusMode,
  setFocusMode,
  sessions,
  sessionsLoading,
  sessionsError,
  sessionId,
  onNewChat,
  onOpenSession,
  onDeleteSession,
  newChatDisabled = false,
  mobile = false, // NEW: render for mobile sheet
}: {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  sessionId: string | null;
  onNewChat: () => void;
  onOpenSession: (s: Session) => void;
  onDeleteSession: (sid: string) => Promise<void>;
  newChatDisabled?: boolean;
  mobile?: boolean; // NEW
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<Session | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const showDeleteAlways = mobile; // NEW: mobile -> always show delete buttons

  const sessionsList = (
    <div className="min-w-0">
      {/* Internal header hidden on mobile to avoid duplicate "Chats" title (Sheet already shows one) */}
      {!mobile && (
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5 border-b border-border bg-sidebar/85 backdrop-blur">
          <div className="flex items-center gap-2">
            <Menu className="h-5 w-5 text-foreground/80" />
            <span className="text-sm font-semibold tracking-wide text-foreground/80">
              Chats
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg hidden md:inline-flex h-8 w-8"
              title={focusMode ? "Show Chats sidebar" : "Hide Chats sidebar"}
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}
      <div className="px-3 pb-2 text-[15px] uppercase font-medium tracking-wide text-muted-foreground">
        Your chats
      </div>
      <div className="px-3 pb-2">
        <Button
          onClick={onNewChat}
          className="w-full justify-start text-left rounded-lg border border-dashed border-border bg-background hover:bg-muted/60 hover:text-foreground h-9 text-sm"
          variant="ghost"
          title="Start a new chat"
          disabled={newChatDisabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          New chat
        </Button>
        {sessionsError && (
          <div className="mt-2 text-[11px] text-red-600 px-2 py-1 rounded-md bg-red-50 border border-red-200">
            {sessionsError}
          </div>
        )}
        {sessionsLoading && !sessions.length && (
          <div className="mt-2 text-[11px] text-muted-foreground px-2 py-1">
            Loading sessions…
          </div>
        )}
        {!sessionsLoading && sessions.length === 0 && (
          <div className="mt-2 text-[11px] text-muted-foreground px-2 py-1">
            No previous chats.
          </div>
        )}
      </div>
      <ul className="px-2 pt-0 pb-4 space-y-1">
        {sessions.map((s) => {
          const isActive = sessionId === s.id;
          return (
            <li key={s.id} className="min-w-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenSession(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSession(s);
                }}
                className={`group relative flex items-center gap-2 rounded-md px-3 py-2 min-w-0 cursor-pointer text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-muted/50 ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-primary rounded-r" />
                )}
                <span className="flex-1 min-w-0 truncate font-medium text-foreground/90 group-hover:text-foreground">
                  {s.topic || "Untitled"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-md p-1.5 text-muted-foreground/70 transition hover:text-red-600 hover:bg-red-600/10 ${
                    showDeleteAlways ? "" : "opacity-0 group-hover:opacity-100"
                  } ${isActive ? "opacity-100" : ""}`}
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
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
              onClick={async () => {
                if (!deleteTarget?.id) return;
                try {
                  setDeleting(true);
                  setDeleteError(null);
                  await onDeleteSession(deleteTarget.id);
                } catch (e: any) {
                  setDeleteError(e?.message || "Unable to delete session.");
                } finally {
                  setDeleting(false);
                  setDeleteTarget(null);
                }
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

  if (mobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-sidebar text-sidebar-foreground">
        <div className="flex-1 overflow-y-auto min-w-0">{sessionsList}</div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`hidden md:flex bg-sidebar flex-col shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${
          focusMode
            ? "md:w-0 md:border-r-0 md:pointer-events-none"
            : "md:w-[clamp(10rem,22vw,13.5rem)] lg:w-[15rem] xl:w-[16rem] md:border-r md:border-border"
        } text-sidebar-foreground relative`}
        aria-hidden={focusMode}
      >
        <div className="flex-1 overflow-y-auto min-w-0">{sessionsList}</div>
        {/* Removed internal reopen button; now rendered externally in Search when focusMode is true */}
      </div>
    </>
  );
}
