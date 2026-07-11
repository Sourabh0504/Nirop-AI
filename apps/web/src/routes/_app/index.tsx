import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Send, MailCheck, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useMailboxes } from "@/hooks/use-mailboxes";
import { useDedupeReport } from "@/hooks/use-subscribers";
import { useLogs } from "@/hooks/use-logs";
import type { CampaignStatus, SendEventLog } from "@/lib/types";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

const statusVariant: Record<CampaignStatus, "secondary" | "default" | "success" | "warning" | "outline"> = {
  draft: "secondary",
  content: "default",
  scheduled: "warning",
  active: "success",
  paused: "warning",
  completed: "outline",
};

const mailboxStatusVariant: Record<string, "warning" | "success" | "secondary" | "destructive"> = {
  warming: "warning",
  active: "success",
  cooldown: "secondary",
  disabled: "destructive",
};

function buildSendVolume(logs: SendEventLog[] | undefined) {
  const days = new Map<string, number>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.set(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), 0);
  }
  for (const event of logs ?? []) {
    if (event.status !== "sent") continue;
    const key = new Date(event.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (days.has(key)) days.set(key, (days.get(key) ?? 0) + 1);
  }
  return Array.from(days, ([day, sent]) => ({ day, sent }));
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

export function Dashboard() {
  const { data: campaigns, isPending: campaignsPending } = useCampaigns();
  const { data: mailboxes, isPending: mailboxesPending } = useMailboxes();
  const { data: report, isPending: reportPending } = useDedupeReport();
  const { data: logs, isPending: logsPending } = useLogs();

  const activeCampaigns = campaigns?.filter((c) => c.status === "active" || c.status === "scheduled").length ?? 0;
  const sentToday = logs?.filter((e) => e.status === "sent" && isToday(e.created_at)).length ?? 0;
  const sentTotal = logs?.filter((e) => e.status === "sent").length ?? 0;
  const failedTotal = logs?.filter((e) => e.status === "failed").length ?? 0;
  const attempted = sentTotal + failedTotal;
  const failureRate = attempted > 0 ? failedTotal / attempted : null;

  const sendVolume = buildSendVolume(logs);
  const recentCampaigns = (campaigns ?? []).slice(0, 5);

  const kpis = [
    {
      label: "Total Subscribers",
      value: report?.total ?? 0,
      delta: `${report?.active ?? 0} active`,
      icon: Users,
      pending: reportPending,
    },
    {
      label: "Active Campaigns",
      value: activeCampaigns,
      delta: `${campaigns?.length ?? 0} total`,
      icon: Send,
      pending: campaignsPending,
    },
    {
      label: "Emails Sent Today",
      value: sentToday,
      delta: `${sentTotal} all-time`,
      icon: MailCheck,
      pending: logsPending,
    },
    {
      label: "Failure Rate",
      value: failureRate === null ? "—" : `${(failureRate * 100).toFixed(0)}%`,
      delta: "Circuit breaker at 15%",
      icon: ShieldAlert,
      pending: logsPending,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your sending pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{kpi.label}</CardTitle>
              <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <kpi.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              {kpi.pending ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <CardValue>{kpi.value}</CardValue>
              )}
              <p className="text-muted-foreground mt-1.5 text-xs">{kpi.delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Send volume (14 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sendVolume} margin={{ left: -20, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--popover-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#sentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mailboxes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {mailboxesPending ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : !mailboxes || mailboxes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No mailboxes yet.{" "}
                <Link to="/mailboxes" className="text-primary hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              mailboxes.map((mb) => (
                <div key={mb.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{mb.label}</p>
                    <p className="text-muted-foreground text-xs">up to {mb.daily_limit}/day</p>
                  </div>
                  <Badge variant={mailboxStatusVariant[mb.status]} className="shrink-0">
                    {mb.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {campaignsPending ? (
            <div className="flex flex-col gap-2 px-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentCampaigns.length === 0 ? (
            <div className="px-5">
              <EmptyState icon={Send} title="No campaigns yet" description="Create your first campaign to see it here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Campaign</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-5">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCampaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-5 font-medium">
                      <Link to="/campaigns/$campaignId" params={{ campaignId: c.id }} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.site}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground pr-5">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
