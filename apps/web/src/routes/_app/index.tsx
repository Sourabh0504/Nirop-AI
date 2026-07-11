import { createFileRoute } from "@tanstack/react-router";
import { Users, Send, MailCheck, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

const sendVolume = [
  { day: "Jul 1", sent: 320 },
  { day: "Jul 2", sent: 410 },
  { day: "Jul 3", sent: 380 },
  { day: "Jul 4", sent: 520 },
  { day: "Jul 5", sent: 610 },
  { day: "Jul 6", sent: 590 },
  { day: "Jul 7", sent: 705 },
  { day: "Jul 8", sent: 680 },
  { day: "Jul 9", sent: 760 },
  { day: "Jul 10", sent: 840 },
  { day: "Jul 11", sent: 812 },
];

type Trend = "up" | "down" | "neutral";

const kpis: { label: string; value: string; delta: string; trend: Trend; icon: typeof Users }[] = [
  {
    label: "Total Subscribers",
    value: "0",
    delta: "Sync from Sheets to populate",
    trend: "neutral",
    icon: Users,
  },
  {
    label: "Active Campaigns",
    value: "0",
    delta: "No campaigns yet",
    trend: "neutral" as const,
    icon: Send,
  },
  {
    label: "Emails Sent Today",
    value: "0",
    delta: "Across all mailboxes",
    trend: "neutral" as const,
    icon: MailCheck,
  },
  {
    label: "Bounce Rate",
    value: "—",
    delta: "Target < 2%",
    trend: "neutral" as const,
    icon: TrendingDown,
  },
];

const mailboxes = [
  { label: "jobs@jobsociety.in", used: 0, limit: 50, status: "warming" as const },
  { label: "updates@jobsociety.in", used: 0, limit: 50, status: "warming" as const },
  { label: "news@testingsociety.com", used: 0, limit: 50, status: "warming" as const },
];

const recentCampaigns = [
  { name: "No campaigns yet", site: "—", status: "draft" as const, sent: "—" },
];

const statusVariant = {
  draft: "secondary",
  scheduled: "default",
  active: "success",
  completed: "outline",
} as const;

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your sending pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{kpi.label}</CardTitle>
              <kpi.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <CardValue>{kpi.value}</CardValue>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                {kpi.trend === "up" && <ArrowUpRight className="text-success size-3" />}
                {kpi.trend === "down" && <ArrowDownRight className="text-destructive size-3" />}
                {kpi.delta}
              </p>
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
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#sentGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mailbox quota usage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mailboxes.map((mb) => (
              <div key={mb.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{mb.label}</span>
                  <Badge variant="warning" className="shrink-0">
                    {mb.status}
                  </Badge>
                </div>
                <Progress value={(mb.used / mb.limit) * 100} />
                <span className="text-muted-foreground text-xs">
                  {mb.used} / {mb.limit} today
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent campaigns</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Campaign</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCampaigns.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="text-foreground pl-5 font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.site}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">{c.sent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
