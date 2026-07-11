import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Loader2, Trash2, CheckCircle2, Circle, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/layout/empty-state";
import {
  useCampaign,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useGenerateVariants,
  useSendCampaign,
} from "@/hooks/use-campaigns";
import { useCampaignStats } from "@/hooks/use-logs";
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

const generateSchema = z.object({
  base_subject: z.string().min(1, "Required"),
  base_html_body: z.string().min(1, "Required"),
  base_text_body: z.string().min(1, "Required"),
  count: z.coerce.number().int().min(1).max(12),
});

type GenerateFormValues = z.infer<typeof generateSchema>;

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
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const { data: campaign, isPending } = useCampaign(campaignId);
  const { data: stats } = useCampaignStats(campaignId);
  const createVariant = useCreateVariant(campaignId);
  const updateVariant = useUpdateVariant(campaignId);
  const deleteVariant = useDeleteVariant(campaignId);
  const generateVariants = useGenerateVariants(campaignId);
  const sendCampaign = useSendCampaign(campaignId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantFormValues>({ resolver: zodResolver(variantSchema) });

  const {
    register: registerGenerate,
    handleSubmit: handleGenerateSubmit,
    reset: resetGenerate,
    formState: { errors: generateErrors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: { count: 10 },
  });

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

  async function onGenerateSubmit(values: GenerateFormValues) {
    try {
      const result = await generateVariants.mutateAsync(values);
      if (result.flagged_count > 0) {
        toast.warning(
          `Added ${result.variants.length} variants — ${result.flagged_count} contain possible spam-trigger wording, review before approving.`,
        );
      } else {
        toast.success(`Added ${result.variants.length} AI-generated variants`);
      }
      resetGenerate({ base_subject: "", base_html_body: "", base_text_body: "", count: 10 });
      setGenerateOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.status === 502
            ? "AI generation isn't configured yet — set OPENAI_API_KEY on the backend."
            : err.message
          : "Failed to generate variants",
      );
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

  async function handleSend() {
    try {
      await sendCampaign.mutateAsync();
      toast.success("Campaign queued for sending");
      setSendOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send campaign");
    }
  }

  if (isPending) {
    return <div className="text-muted-foreground text-sm">Loading campaign…</div>;
  }

  if (!campaign) {
    return <div className="text-muted-foreground text-sm">Campaign not found.</div>;
  }

  const approvedCount = campaign.variants.filter((v) => v.approved).length;
  const alreadySent = campaign.status !== "draft" && campaign.status !== "content";
  const canSend = approvedCount > 0 && !alreadySent;

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
          <div className="flex items-center gap-2">
            <Dialog open={sendOpen} onOpenChange={setSendOpen}>
              <Button
                size="sm"
                variant={alreadySent ? "outline" : "default"}
                disabled={!canSend}
                onClick={() => setSendOpen(true)}
                title={alreadySent ? `Already ${campaign.status}` : undefined}
              >
                <Send className="size-4" /> {alreadySent ? campaign.status : "Send campaign"}
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send this campaign?</DialogTitle>
                  <DialogDescription>
                    This dispatches to every active subscriber on <strong>{campaign.site}</strong> right
                    away via the Celery worker — there's no scheduling/delay yet, this sends now.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-2">
                  <Button variant="outline" onClick={() => setSendOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSend} disabled={sendCampaign.isPending}>
                    {sendCampaign.isPending && <Loader2 className="size-4 animate-spin" />}
                    Send now
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
              <Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="size-4" /> Generate with AI
              </Button>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Generate variants with AI</DialogTitle>
                  <DialogDescription>
                    Give Claude a base subject/body and it'll draft variants for you to review and
                    approve — nothing is sent without your sign-off.
                  </DialogDescription>
                </DialogHeader>
                <form className="flex flex-col gap-3" onSubmit={handleGenerateSubmit(onGenerateSubmit)}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="base_subject">Base subject</Label>
                    <Input
                      id="base_subject"
                      placeholder="5 new jobs this week"
                      {...registerGenerate("base_subject")}
                    />
                    {generateErrors.base_subject && (
                      <p className="text-destructive text-xs">{generateErrors.base_subject.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="base_html_body">Base HTML body</Label>
                    <Textarea
                      id="base_html_body"
                      rows={5}
                      placeholder="<p>Hi there…</p>"
                      {...registerGenerate("base_html_body")}
                    />
                    {generateErrors.base_html_body && (
                      <p className="text-destructive text-xs">{generateErrors.base_html_body.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="base_text_body">Base plain text body</Label>
                    <Textarea
                      id="base_text_body"
                      rows={3}
                      placeholder="Hi there…"
                      {...registerGenerate("base_text_body")}
                    />
                    {generateErrors.base_text_body && (
                      <p className="text-destructive text-xs">{generateErrors.base_text_body.message}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="count">Number of variants</Label>
                    <Input id="count" type="number" min={1} max={12} {...registerGenerate("count")} />
                    {generateErrors.count && (
                      <p className="text-destructive text-xs">{generateErrors.count.message}</p>
                    )}
                  </div>
                  <DialogFooter className="mt-2">
                    <Button type="submit" disabled={generateVariants.isPending}>
                      {generateVariants.isPending && <Loader2 className="size-4 animate-spin" />}
                      Generate
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Add variant
              </Button>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add variant</DialogTitle>
                  <DialogDescription>Write the subject and body for this variant by hand.</DialogDescription>
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
        </div>
        <p className="text-muted-foreground text-sm">
          {campaign.site} · {approvedCount} of {campaign.variants.length} variants approved
        </p>
      </div>

      {stats && stats.queued + stats.sent + stats.failed + stats.retrying > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader><CardTitle>Queued</CardTitle></CardHeader>
            <CardContent><CardValue>{stats.queued}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sent</CardTitle></CardHeader>
            <CardContent><CardValue className="text-success">{stats.sent}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Failed</CardTitle></CardHeader>
            <CardContent><CardValue className="text-destructive">{stats.failed}</CardValue></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Retrying</CardTitle></CardHeader>
            <CardContent><CardValue>{stats.retrying}</CardValue></CardContent>
          </Card>
        </div>
      )}

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
