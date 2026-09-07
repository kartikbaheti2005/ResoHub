import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Bell, LogOut, LayoutDashboard, CalendarRange, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/frontend/hooks/useSession";
import { listNotifications, markNotificationsRead } from "@/backend/account.functions";
import { cn } from "@/lib/utils";

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Building2; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      activeProps={{ className: "bg-secondary text-foreground" }}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 60_000,
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 && (
            <button
              className="text-xs font-medium text-primary"
              onClick={async () => {
                await markNotificationsRead({ data: {} });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {items.slice(0, 12).map((n) => (
            <div
              key={n.id}
              className={cn(
                "border-b border-border/60 px-2 py-3 last:border-0",
                !n.isRead && "bg-secondary/50",
              )}
            >
              <p className="text-sm font-semibold">{n.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.message}</p>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, isManager } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-2 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
              <Building2 className="size-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">ResoHub</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/resources" icon={Building2} label="Resources" />
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/my-bookings" icon={CalendarRange} label="My bookings" />
            {isManager && <NavItem to="/manage" icon={Settings2} label="Manage" />}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="rounded-full px-3">
                  <span className="max-w-[10rem] truncate text-sm">
                    {profile?.name ?? "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{profile?.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">{profile?.email}</p>
                  <p className="mt-1 text-xs font-normal text-primary">
                    {profile?.role} · {profile?.department}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
