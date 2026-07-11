import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLogs } from "@/hooks/use-logs";
import type { SendEventStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/logs")({
  component: Logs,
});

const statusVariant: Record<SendEventStatus, "secondary" | "success" | "destructive" | "warning"> = {
  queued: "secondary",
  sent: "success",
  failed: "destructive",
  retrying: "warning",
};

function Logs() {
  const { data: events, isPending } = useLogs();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Logs" description="Send events across all campaigns, refreshed every 10s." />

      {isPending ? (
        <div className="text-muted-foreground text-sm">Loading logs…</div>
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No send events yet"
          description="Once a campaign is scheduled and sending, delivery events will show up here."
        />
      ) : (
        <div className="border-border/70 rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Campaign</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Mailbox</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="pl-5 font-medium">{event.campaign_name}</TableCell>
                  <TableCell className="text-muted-foreground">{event.subscriber_email}</TableCell>
                  <TableCell className="text-muted-foreground">{event.mailbox_label ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[event.status]}>{event.status}</Badge>
                    {event.error && <p className="text-destructive mt-1 text-xs">{event.error}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground pr-5">
                    {new Date(event.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
