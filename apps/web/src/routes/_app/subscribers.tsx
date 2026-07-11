import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscribers, useCreateSubscriber, useDeleteSubscriber, useDedupeReport } from "@/hooks/use-subscribers";
import { ApiError } from "@/lib/api";
import type { SubscriberStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/subscribers")({
  component: Subscribers,
});

const subscriberSchema = z.object({
  email: z.string().email("Enter a valid email"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  source_site: z.string().min(1, "Required"),
  tags: z.string().optional(),
});

type SubscriberFormValues = z.infer<typeof subscriberSchema>;

const statusVariant: Record<SubscriberStatus, "success" | "secondary" | "destructive" | "warning"> = {
  active: "success",
  unsubscribed: "secondary",
  bounced: "destructive",
  suppressed: "warning",
};

function Subscribers() {
  const [open, setOpen] = useState(false);
  const { data: subscribers, isPending } = useSubscribers();
  const { data: report } = useDedupeReport();
  const createSubscriber = useCreateSubscriber();
  const deleteSubscriber = useDeleteSubscriber();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscriberFormValues>({
    resolver: zodResolver(subscriberSchema),
    defaultValues: { source_site: "jobsociety" },
  });

  async function onSubmit(values: SubscriberFormValues) {
    try {
      await createSubscriber.mutateAsync({
        email: values.email,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        source_site: values.source_site,
        tags: values.tags
          ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      });
      toast.success(`Added ${values.email}`);
      reset({ source_site: values.source_site, email: "", first_name: "", last_name: "", tags: "" });
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 409
          ? "That email is already on the list"
          : err instanceof ApiError
            ? err.message
            : "Failed to add subscriber",
      );
    }
  }

  async function handleDelete(id: string, email: string) {
    try {
      await deleteSubscriber.mutateAsync(id);
      toast.success(`Removed ${email}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove subscriber");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscribers"
        description="Manually added for now — Google Sheets bulk sync lands in a later milestone."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add subscriber
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add subscriber</DialogTitle>
                <DialogDescription>Emails are deduplicated case-insensitively.</DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="jane@example.com" {...register("email")} />
                  {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="first_name">First name</Label>
                    <Input id="first_name" placeholder="Jane" {...register("first_name")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input id="last_name" placeholder="Doe" {...register("last_name")} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="source_site">Site</Label>
                  <Select id="source_site" {...register("source_site")}>
                    <option value="jobsociety">JobSociety.in</option>
                    <option value="testingsociety">TestingSociety.com</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input id="tags" placeholder="engineering, remote" {...register("tags")} />
                </div>
                <DialogFooter className="mt-2">
                  <Button type="submit" disabled={createSubscriber.isPending}>
                    {createSubscriber.isPending && <Loader2 className="size-4 animate-spin" />}
                    Add subscriber
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {report && report.total > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Active</CardTitle></CardHeader>
            <CardContent><CardValue>{report.active}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Unsubscribed</CardTitle></CardHeader>
            <CardContent><CardValue>{report.unsubscribed}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bounced</CardTitle></CardHeader>
            <CardContent><CardValue>{report.bounced}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Suppressed</CardTitle></CardHeader>
            <CardContent><CardValue>{report.suppressed}</CardValue></CardContent>
          </Card>
        </div>
      )}

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : !subscribers || subscribers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No subscribers yet"
          description="Add a subscriber to start building your list — bulk Sheets sync is coming in a later milestone."
          actionLabel="Add subscriber"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="surface-elevated bg-card border-border/60 rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="rounded-tl-xl pl-5">Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 rounded-tr-xl pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-5 font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                        {s.email[0].toUpperCase()}
                      </span>
                      {s.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[s.first_name, s.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.source_site}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="pr-5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id, s.email)}
                      aria-label={`Remove ${s.email}`}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
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
