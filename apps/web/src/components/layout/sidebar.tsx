import {
  LayoutDashboard,
  Users,
  Send,
  Mailbox,
  ScrollText,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subscribers", label: "Subscribers", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/mailboxes", label: "Mailboxes", icon: Mailbox },
  { to: "/logs", label: "Logs", icon: ScrollText },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="relative flex h-16 items-center gap-2.5 px-5">
        <div className="relative">
          <div
            className="bg-sidebar-primary absolute inset-0 rounded-lg opacity-50 blur-md"
            aria-hidden="true"
          />
          <div className="bg-sidebar-primary font-display relative flex size-8 items-center justify-center rounded-lg text-base font-bold text-white shadow-lg">
            N
          </div>
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight">Nirop AI</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all active:scale-[0.98]",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <span className="bg-sidebar-primary absolute top-1/2 -left-3 h-4 w-0.5 -translate-y-1/2 rounded-full" />
              )}
              <Icon className={cn("size-4", active && "text-sidebar-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-sidebar-border text-sidebar-foreground/50 border-t px-5 py-4 text-xs">
        Nirop AI &middot; v0.1
      </div>
    </aside>
  );
}
