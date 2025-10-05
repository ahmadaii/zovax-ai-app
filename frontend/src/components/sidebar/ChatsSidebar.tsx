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
  newChatDisabled = false, // NEW: disable prop
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
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<Session | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const sessionsList = (
    <div className="min-w-0">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-border bg-muted/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-foreground/80" />
          <span className="text-sm font-semibold tracking-wide text-foreground/80">
            Chats
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hidden md:inline-flex h-10 w-10"
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

      <div className="px-3 pt-3 pb-2 text-xs text-muted-foreground">
        Your sessions
      </div>

      <div className="px-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-start text-left rounded-xl border border-dashed border-border bg-background hover:bg-muted/60 hover:text-foreground"
          variant="ghost"
          title="Start a new chat"
          disabled={newChatDisabled} // NEW
        >
          <Plus className="h-4 w-4 mr-2" />
          New chat
        </Button>

        {sessionsError && (
          <div className="mt-2 text-xs text-red-600 px-2 py-1 rounded-md bg-red-50 border border-red-200">
            {sessionsError}
          </div>
        )}
        {sessionsLoading && !sessions.length && (
          <div className="mt-2 text-xs text-muted-foreground px-2 py-1">
            Loading sessions…
          </div>
        )}
        {!sessionsLoading && sessions.length === 0 && (
          <div className="mt-2 text-xs text-muted-foreground px-2 py-1">
            No saved sessions yet.
          </div>
        )}
      </div>

      <ul className="px-2 pt-1 pb-3 space-y-1.5">
        {sessions.map((s) => {
          const isActive = sessionId === s.id;
          const rowBase =
            "group w-full rounded-lg px-3 py-1 flex items-center gap-1 min-w-0 cursor-pointer " +
            "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
          const rowState = isActive
            ? "bg-primary/10 ring-1 ring-primary/20"
            : "hover:bg-muted/60";

          return (
            <li key={s.id} className="min-w-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenSession(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSession(s);
                }}
                className={`${rowBase} ${rowState}`}
              >
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                  {s.topic || "Untitled"}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-md p-1.5 text-muted-foreground transition ${
                    isActive
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  } hover:bg-red-600/10 hover:text-red-600`}
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

  return (
    <div
      className={`hidden md:flex bg-muted/40 flex-col transition-[width] duration-200 ease-in-out overflow-hidden ${
        focusMode
          ? "md:w-0 md:border-r-0 md:pointer-events-none"
          : "md:w-64 md:border-r md:border-border"
      }`}
      aria-hidden={focusMode}
    >
      <div className="flex-1 overflow-y-auto">{sessionsList}</div>
    </div>
  );
}
