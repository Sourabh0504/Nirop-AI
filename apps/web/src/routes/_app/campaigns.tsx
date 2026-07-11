import { createFileRoute } from "@tanstack/react-router";
import { Send, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/campaigns")({
  component: Campaigns,
});

function Campaigns() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Draft, generate variants, and schedule sends."
        actions={
          <Button size="sm">
            <Plus className="size-4" /> New campaign
          </Button>
        }
      />
      <EmptyState
        icon={Send}
        title="No campaigns yet"
        description="Create your first campaign to draft content, generate AI variants, and schedule a send."
        actionLabel="New campaign"
      />
    </div>
  );
}
