import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, useAccent } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { accent, setAccent } = useAccent();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Choose accent color">
          <Palette className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Accent color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-1 gap-0.5 p-1">
          {ACCENTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAccent(option.id)}
              className={cn(
                "hover:bg-accent flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm transition-colors",
                accent === option.id && "bg-accent",
              )}
            >
              <span
                className="size-3.5 shrink-0 rounded-full ring-1 ring-black/5"
                style={{ background: `var(--swatch-${option.id})` }}
              />
              <span className="flex-1 text-left">{option.label}</span>
              {accent === option.id && <Check className="text-primary size-3.5" />}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
