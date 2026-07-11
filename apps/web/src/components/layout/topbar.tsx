import { Moon, Sun, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemePicker } from "@/components/layout/theme-picker";
import { useTheme } from "@/hooks/use-theme";
import { useHealth } from "@/hooks/use-health";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";

export function Topbar() {
  const { theme, toggle } = useTheme();
  const { data, isError, isPending } = useHealth();
  const { data: currentUser } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const initials =
    currentUser?.email
      .split("@")[0]
      .slice(0, 2)
      .toUpperCase() ?? "??";

  async function handleSignOut() {
    await logout.mutateAsync();
    await navigate({ to: "/login" });
  }

  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-40 flex h-14 items-center justify-between border-b px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className={
            "size-1.5 rounded-full " +
            (isPending ? "bg-muted-foreground/40" : isError ? "bg-destructive" : "bg-success")
          }
        />
        <span className="text-muted-foreground text-xs">
          {isPending ? "Connecting to API…" : isError ? "API unreachable" : `API online · ${data?.environment}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <ThemePicker />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/15 text-primary">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{currentUser?.email ?? "Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
