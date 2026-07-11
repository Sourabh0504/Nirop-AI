import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Loader2, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/layout/empty-state";
import {
  useCampaign,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
} from "@/hooks/use-campaigns";
import { ApiError } from "@/lib/api";
import type { CampaignStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/campaigns/$campaignId")({
  component: CampaignDetail,
});

const variantSchema = z.object({
  subject: z.string().min(1, "Required"),
  html_body: z.string().min(1, "Required"),
  text_body: z.string().min(1, "Required"),
});

type VariantFormValues = z.infer<typeof variantSchema>;

const statusVariant: Record<CampaignStatus, "secondary" | "default" | "success" | "warning" | "outline"> = {
  draft: "secondary",
  content: "default",
  scheduled: "warning",
  active: "success",
  paused: "warning",
  completed: "outline",
};

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const [open, setOpen] = useState(false);
  const { data: campaign, isPending } = useCampaign(campaignId);
  const createVariant = useCreateVariant(campaignId);
  const updateVariant = useUpdateVariant(campaignId);
  const deleteVariant = useDeleteVariant(campaignId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantFormValues>({ resolver: zodResolver(variantSchema) });

  async function onSubmit(values: VariantFormValues) {
    try {
      await createVariant.mutateAsync(values);
      toast.success("Variant added");
      reset({ subject: "", html_body: "", text_body: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add variant");
    }
  }

  async function toggleApproved(variantId: string, approved: boolean) {
    try {
      await updateVariant.mutateAsync({ variantId, approved: !approved });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update variant");
    }
  }

  async function handleDeleteVariant(variantId: string) {
    try {
      await deleteVariant.mutateAsync(variantId);
      toast.success("Variant removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove variant");
    }
  }

  if (isPending) {
    return <div className="text-muted-foreground text-sm">Loading campaign…</div>;
  }

  if (!campaign) {
    return <div className="text-muted-foreground text-sm">Campaign not found.</div>;
  }

  const approvedCount = campaign.variants.filter((v) => v.approved).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          to="/campaigns"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm w-fit"
        >
          <ArrowLeft className="size-3.5" /> Campaigns
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
            <Badge variant={statusVariant[campaign.status]}>{campaign.status}</Badge>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add variant
            </Button>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add variant</DialogTitle>
                <DialogDescription>
                  Write the subject and body for this variant. AI-assisted generation comes next.
                </DialogDescription>
              </DialogHeader>
              <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="5 new jobs this week" {...register("subject")} />
                  {errors.subject && <p className="text-destructive text-xs">{errors.subject.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="html_body">HTML body</Label>
                  <Textarea id="html_body" rows={5} placeholder="<p>Hi there…</p>" {...register("html_body")} />
                  {errors.html_body && <p className="text-destructive text-xs">{errors.html_body.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="text_body">Plain text body</Label>
                  <Textarea id="text_body" rows={3} placeholder="Hi there…" {...register("text_body")} />
                  {errors.text_body && <p className="text-destructive text-xs">{errors.text_body.message}</p>}
                </div>
                <DialogFooter className="mt-2">
                  <Button type="submit" disabled={createVariant.isPending}>
                    {createVariant.isPending && <Loader2 className="size-4 animate-spin" />}
                    Add variant
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground text-sm">
          {campaign.site} · {approvedCount} of {campaign.variants.length} variants approved
        </p>
      </div>

      {campaign.variants.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No variants yet"
          description="Add at least one subject/body variant before this campaign can be scheduled."
          actionLabel="Add variant"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaign.variants.map((variant) => (
            <Card key={variant.id}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-foreground text-sm font-medium">
                    Variant {variant.variant_index + 1}
                  </CardTitle>
                  <p className="mt-1 text-sm font-medium">{variant.subject}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={variant.approved ? "Mark as not approved" : "Approve variant"}
                    onClick={() => toggleApproved(variant.id, variant.approved)}
                  >
                    {variant.approved ? (
                      <CheckCircle2 className="text-success size-4" />
                    ) : (
                      <Circle className="text-muted-foreground size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete variant"
                    onClick={() => handleDeleteVariant(variant.id)}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Badge variant={variant.approved ? "success" : "secondary"} className="w-fit">
                  {variant.approved ? "Approved" : "Needs review"}
                </Badge>
                <p className="text-muted-foreground line-clamp-3 text-xs">{variant.text_body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
