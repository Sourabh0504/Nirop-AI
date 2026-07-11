import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns, useCreateCampaign } from "@/hooks/use-campaigns";
import { ApiError } from "@/lib/api";
import type { CampaignStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/campaigns/")({
  component: Campaigns,
});

const campaignSchema = z.object({
  name: z.string().min(1, "Required"),
  site: z.string().min(1, "Required"),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

const statusVariant: Record<CampaignStatus, "secondary" | "default" | "success" | "warning" | "outline"> = {
  draft: "secondary",
  content: "default",
  scheduled: "warning",
  active: "success",
  paused: "warning",
  completed: "outline",
};

function Campaigns() {
  const [open, setOpen] = useState(false);
  const { data: campaigns, isPending } = useCampaigns();
  const createCampaign = useCreateCampaign();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { site: "jobsociety" },
  });

  async function onSubmit(values: CampaignFormValues) {
    try {
      await createCampaign.mutateAsync(values);
      toast.success(`Created ${values.name}`);
      reset({ name: "", site: "jobsociety" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create campaign");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Draft, generate variants, and schedule sends."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> New campaign
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New campaign</DialogTitle>
                <DialogDescription>Give it a name and pick which site it's for.</DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Campaign name</Label>
                  <Input id="name" placeholder="July job digest" {...register("name")} />
                  {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site">Site</Label>
                  <Select id="site" {...register("site")}>
                    <option value="jobsociety">JobSociety.in</option>
                    <option value="testingsociety">TestingSociety.com</option>
                  </Select>
                </div>
                <DialogFooter className="mt-2">
                  <Button type="submit" disabled={createCampaign.isPending}>
                    {createCampaign.isPending && <Loader2 className="size-4 animate-spin" />}
                    Create campaign
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No campaigns yet"
          description="Create your first campaign to draft content, generate AI variants, and schedule a send."
          actionLabel="New campaign"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Total</CardTitle></CardHeader>
              <CardContent><CardValue>{campaigns.length}</CardValue></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Active / scheduled</CardTitle></CardHeader>
              <CardContent>
                <CardValue className="text-success">
                  {campaigns.filter((c) => c.status === "active" || c.status === "scheduled").length}
                </CardValue>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Draft</CardTitle></CardHeader>
              <CardContent>
                <CardValue>{campaigns.filter((c) => c.status === "draft" || c.status === "content").length}</CardValue>
              </CardContent>
            </Card>
          </div>

          <div className="surface-elevated bg-card border-border/60 rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rounded-tl-xl pl-5">Campaign</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="rounded-tr-xl pr-5">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell className="pl-5 font-medium">
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: c.id }}
                        className="hover:text-primary transition-colors"
                      >
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
          </div>
        </>
      )}
    </div>
  );
}
