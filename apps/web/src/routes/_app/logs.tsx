import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";

export const Route = createFileRoute("/_app/logs")({
  component: Logs,
});

function Logs() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Logs" description="Send events, bounces, and unsubscribes across all campaigns." />
      <EmptyState
        icon={ScrollText}
        title="No send events yet"
        description="Once a campaign is scheduled and sending, delivery events will show up here."
      />
    </div>
  );
}
