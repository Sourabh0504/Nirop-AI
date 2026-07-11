import { createFileRoute } from "@tanstack/react-router";
import { Users, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/subscribers")({
  component: Subscribers,
});

function Subscribers() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscribers"
        description="Synced from Google Sheets for JobSociety.in and TestingSociety.com."
        actions={
          <Button size="sm" variant="outline">
            <RefreshCw className="size-4" /> Sync now
          </Button>
        }
      />
      <EmptyState
        icon={Users}
        title="No subscribers yet"
        description="Connect a Google Sheet and run a sync to pull in your subscriber list."
        actionLabel="Sync from Sheets"
      />
    </div>
  );
}
