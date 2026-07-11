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
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="bg-sidebar-primary font-display flex size-7 items-center justify-center rounded-lg text-[15px] font-bold text-white">
          N
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
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <span className="bg-sidebar-primary absolute top-1/2 -left-3 h-4 w-0.5 -translate-y-1/2 rounded-full" />
              )}
              <Icon className="size-4" />
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
