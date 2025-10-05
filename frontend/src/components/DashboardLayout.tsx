import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, BarChart3, BookOpen, LogOut, Menu } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

const navigation = [
  { title: "Search", icon: Search, url: "/dashboard/search" },
  { title: "Analytics", icon: BarChart3, url: "/dashboard/analytics" },
  { title: "Knowledge Base", icon: BookOpen, url: "/dashboard/knowledge-base" },
];

type LocalUserRecord = {
  user?: {
    email_address?: string;
    email?: string;
    user_name?: string;
    name?: string;
  };
  email_address?: string;
  email?: string;
  user_name?: string;
  name?: string;
};

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const [a, b] = [parts[0], parts[1]];
  const first = a?.[0] ?? "";
  const second = b?.[0] ?? a?.[1] ?? "";
  return (first + second).toUpperCase();
}

function useLocalUser() {
  const [u, setU] = useState<{ name?: string; email?: string } | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("user");
        if (!raw) return setU(null);
        const parsed: LocalUserRecord = JSON.parse(raw);
        const base = parsed?.user ?? parsed;
        const name = base?.user_name || base?.name || undefined;
        const email = base?.email_address || base?.email || undefined;
        setU({ name, email });
      } catch {
        setU(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "user") read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return u;
}

/* ------------------ helpers for shadcn sidebar state ------------------ */
function useSidebarState() {
  const ctx = useSidebar() as any;
  const isCollapsed =
    typeof ctx?.state === "string"
      ? ctx.state === "collapsed"
      : typeof ctx?.open === "boolean"
      ? !ctx.open
      : false;

  const setCollapsed = (collapsed: boolean) => {
    if (typeof ctx?.state === "string") {
      if (
        (collapsed && ctx.state !== "collapsed") ||
        (!collapsed && ctx.state !== "expanded")
      ) {
        ctx?.toggleSidebar?.();
      }
    } else if (typeof ctx?.open === "boolean") {
      if ((collapsed && ctx.open) || (!collapsed && !ctx.open))
        ctx?.toggleSidebar?.();
    } else {
      ctx?.toggleSidebar?.();
    }
  };

  return {
    isCollapsed,
    setCollapsed,
    toggle: ctx?.toggleSidebar ?? (() => {}),
  };
}

function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCollapsed, setCollapsed, toggle } = useSidebarState();

  // If the user expands manually, pin open and stop auto-collapse
  const [pinnedOpen, setPinnedOpen] = useState<boolean>(() => {
    return localStorage.getItem("sidebar:pinned-open") === "true";
  });

  const onToggleClick = () => {
    const nextCollapsed = !isCollapsed;
    setCollapsed(nextCollapsed);
    if (nextCollapsed) {
      localStorage.setItem("sidebar:pinned-open", "false");
      setPinnedOpen(false);
    } else {
      localStorage.setItem("sidebar:pinned-open", "true");
      setPinnedOpen(true);
    }
  };

  // Auto-collapse to icon rail when a chat message is sent — unless pinned open
  useEffect(() => {
    const handler = () => {
      if (!pinnedOpen) setCollapsed(true);
    };
    window.addEventListener("chat:messageSent", handler);
    return () => window.removeEventListener("chat:messageSent", handler);
  }, [pinnedOpen, setCollapsed]);

  return (
    <Sidebar
      /* ensures “collapsed” shows an icon rail instead of disappearing */
      collapsible="icon"
      className="border-r border-border w-[240px] data-[state=collapsed]:w-16"
    >
      <SidebarHeader className="h-16 border-b border-border">
        <div className="h-full flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ZOVAX
            </h1>
          )}
          <SidebarTrigger
            className="rounded-md shrink-0 h-8 w-8"
            title="Toggle sidebar"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      /* Keep icons; hide only labels when collapsed */
                      className={`${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      } transition-colors duration-200 flex items-center ${
                        isCollapsed ? "justify-center gap-0 px-4" : "gap-2"
                      }`}
                      title={item.title} // tooltip when collapsed
                    >
                      {/* ICON — always visible */}
                      <item.icon className="h-5 w-5 shrink-0" />
                      {/* LABEL — hidden when collapsed */}
                      {!isCollapsed && (
                        <span className="ml-2 truncate">{item.title}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, currentUser, currentTenant } = useTenant();
  const localUser = useLocalUser();
  const { isCollapsed } = useSidebarState();

  const getPageTitle = () => {
    if (location.pathname.includes("/search/results/")) return "Search Results";
    const currentNav = navigation.find(
      (item) => location.pathname === item.url
    );
    if (currentNav) return currentNav.title;
    if (
      location.pathname === "/dashboard" ||
      location.pathname === "/dashboard/"
    )
      return "Search";
    return "Dashboard";
  };

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  const displayName = localUser?.name || currentUser?.name || "User";
  const displayEmail =
    localUser?.email || currentUser?.email || "user@example.com";
  const initials = getInitials(displayName);

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-0">
          {/* Show the brand in header when sidebar is collapsed */}
          <h2 className="text-lg font-semibold truncate">{getPageTitle()}</h2>
        </div>
        {isCollapsed && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
            aria-hidden="true"
          >
            <span className="font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent text-2xl">
              ZOVAX
            </span>
          </div>
        )}

        {/* Right cluster */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {displayEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentTenant?.name}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
