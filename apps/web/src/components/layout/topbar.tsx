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
import { cn } from "@/lib/utils";

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
    <header className="border-border/60 bg-background/85 sticky top-0 z-40 flex h-16 items-center justify-between border-b px-6 backdrop-blur-md">
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
          isPending
            ? "border-border bg-muted text-muted-foreground"
            : isError
              ? "border-destructive/25 bg-destructive/10 text-destructive"
              : "border-success/25 bg-success/10 text-success",
        )}
      >
        <span className="relative flex size-1.5">
          {!isPending && !isError && (
            <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex size-1.5 rounded-full",
              isPending ? "bg-muted-foreground/50" : isError ? "bg-destructive" : "bg-success",
            )}
          />
        </span>
        {isPending ? "Connecting…" : isError ? "API unreachable" : `API online · ${data?.environment}`}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <ThemePicker />

        <div className="bg-border mx-2 h-6 w-px" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-accent flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors">
              <Avatar className="ring-border size-8 ring-1">
                <AvatarFallback className="bg-primary/15 text-primary font-display font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="truncate">{currentUser?.email ?? "Account"}</DropdownMenuLabel>
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
