import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Search, BarChart3, BookOpen, User, LogOut, Menu } from "lucide-react";
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
  {
    title: "Search",
    icon: Search,
    url: "/dashboard/search",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    url: "/dashboard/analytics",
  },
  {
    title: "Knowledge Base",
    icon: BookOpen,
    url: "/dashboard/knowledge-base",
  },
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
  const second = b?.[0] ?? a?.[1] ?? ""; // fallback to second letter of first name
  return (first + second).toUpperCase();
}

/** Reads 'user' from localStorage and returns { name, email } (reactive to changes across tabs). */
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
    // keep in sync if another tab updates localStorage
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "user") read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return u;
}

function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const { currentTenant } = useTenant();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            ZOVAX
          </h1>
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button> */}
        </div>
        {/* <p className="text-sm text-muted-foreground mt-1">
          {currentTenant?.name || "Loading..."}
        </p> */}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.url)}
                      className={`${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      } transition-colors duration-200`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
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

  // NEW: read from localStorage
  const localUser = useLocalUser();

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
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{getPageTitle()}</h2>
        </div>

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
