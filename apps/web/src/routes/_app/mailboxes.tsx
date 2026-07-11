import { createFileRoute } from "@tanstack/react-router";
import { Mailbox, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/mailboxes")({
  component: Mailboxes,
});

function Mailboxes() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mailboxes"
        description="SMTP mailboxes used for sending, with warmup stage and daily quota."
        actions={
          <Button size="sm">
            <Plus className="size-4" /> Add mailbox
          </Button>
        }
      />
      <EmptyState
        icon={Mailbox}
        title="No mailboxes configured"
        description="Add a Hostinger SMTP mailbox to start warming it up before sending campaigns."
        actionLabel="Add mailbox"
      />
    </div>
  );
}
