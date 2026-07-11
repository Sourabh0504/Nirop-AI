import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="border-border/60 bg-card/30 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center backdrop-blur-sm">
      <div className="bg-accent/80 backdrop-blur-sm flex size-11 items-center justify-center rounded-full">
        <Icon className="text-accent-foreground size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {actionLabel && (
        <Button size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
