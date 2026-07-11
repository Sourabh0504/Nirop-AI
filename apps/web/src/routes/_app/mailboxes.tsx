import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mailbox as MailboxIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMailboxes, useCreateMailbox, useDeleteMailbox } from "@/hooks/use-mailboxes";
import { ApiError } from "@/lib/api";
import type { MailboxStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/mailboxes")({
  component: Mailboxes,
});

const mailboxSchema = z.object({
  label: z.string().min(1, "Required"),
  from_name: z.string().min(1, "Required"),
  from_email: z.string().email("Enter a valid email"),
  smtp_host: z.string().min(1, "Required"),
  smtp_port: z.coerce.number().int().min(1).max(65535),
  smtp_user: z.string().min(1, "Required"),
  smtp_password: z.string().min(1, "Required"),
  daily_limit: z.coerce.number().int().min(1).max(2000),
});

type MailboxFormValues = z.infer<typeof mailboxSchema>;

const statusVariant: Record<MailboxStatus, "warning" | "success" | "secondary" | "destructive"> = {
  warming: "warning",
  active: "success",
  cooldown: "secondary",
  disabled: "destructive",
};

function Mailboxes() {
  const [open, setOpen] = useState(false);
  const { data: mailboxes, isPending } = useMailboxes();
  const createMailbox = useCreateMailbox();
  const deleteMailbox = useDeleteMailbox();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MailboxFormValues>({
    resolver: zodResolver(mailboxSchema),
    defaultValues: { smtp_port: 587, daily_limit: 50 },
  });

  async function onSubmit(values: MailboxFormValues) {
    try {
      await createMailbox.mutateAsync(values);
      toast.success(`Added ${values.label}`);
      reset({ smtp_port: 587, daily_limit: 50 } as MailboxFormValues);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add mailbox");
    }
  }

  async function handleDelete(id: string, label: string) {
    try {
      await deleteMailbox.mutateAsync(id);
      toast.success(`Removed ${label}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove mailbox");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mailboxes"
        description="SMTP mailboxes used for sending, with warmup stage and daily quota."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Add mailbox
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add mailbox</DialogTitle>
                <DialogDescription>
                  SMTP credentials are encrypted (AES-256-GCM) before being stored.
                </DialogDescription>
              </DialogHeader>

              <form className="flex flex-col gap-3" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" placeholder="JobSociety Primary" {...register("label")} />
                  {errors.label && <p className="text-destructive text-xs">{errors.label.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="from_name">From name</Label>
                    <Input id="from_name" placeholder="JobSociety Updates" {...register("from_name")} />
                    {errors.from_name && <p className="text-destructive text-xs">{errors.from_name.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="from_email">From email</Label>
                    <Input id="from_email" placeholder="updates@jobsociety.in" {...register("from_email")} />
                    {errors.from_email && <p className="text-destructive text-xs">{errors.from_email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="smtp_host">SMTP host</Label>
                    <Input id="smtp_host" placeholder="smtp.hostinger.com" {...register("smtp_host")} />
                    {errors.smtp_host && <p className="text-destructive text-xs">{errors.smtp_host.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="smtp_port">Port</Label>
                    <Input id="smtp_port" type="number" {...register("smtp_port")} />
                    {errors.smtp_port && <p className="text-destructive text-xs">{errors.smtp_port.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="smtp_user">SMTP user</Label>
                    <Input id="smtp_user" {...register("smtp_user")} />
                    {errors.smtp_user && <p className="text-destructive text-xs">{errors.smtp_user.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="smtp_password">SMTP password</Label>
                    <Input id="smtp_password" type="password" {...register("smtp_password")} />
                    {errors.smtp_password && (
                      <p className="text-destructive text-xs">{errors.smtp_password.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="daily_limit">Daily limit</Label>
                  <Input id="daily_limit" type="number" {...register("daily_limit")} />
                  {errors.daily_limit && <p className="text-destructive text-xs">{errors.daily_limit.message}</p>}
                </div>

                <DialogFooter className="mt-2">
                  <Button type="submit" disabled={createMailbox.isPending}>
                    {createMailbox.isPending && <Loader2 className="size-4 animate-spin" />}
                    Add mailbox
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : !mailboxes || mailboxes.length === 0 ? (
        <EmptyState
          icon={MailboxIcon}
          title="No mailboxes configured"
          description="Add a Hostinger SMTP mailbox to start warming it up before sending campaigns."
          actionLabel="Add mailbox"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="surface-elevated bg-card border-border/60 rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="rounded-tl-xl pl-5">Mailbox</TableHead>
                <TableHead>SMTP host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Daily quota</TableHead>
                <TableHead className="w-12 rounded-tr-xl pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailboxes.map((mb) => (
                <TableRow key={mb.id}>
                  <TableCell className="pl-5">
                    <div className="flex items-center gap-2.5">
                      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <MailboxIcon className="size-4" />
                      </span>
                      <div>
                        <div className="font-medium">{mb.label}</div>
                        <div className="text-muted-foreground text-xs">{mb.from_email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {mb.smtp_host}:{mb.smtp_port}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[mb.status]}>{mb.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">up to {mb.daily_limit}/day</TableCell>
                  <TableCell className="pr-5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(mb.id, mb.label)}
                      aria-label={`Remove ${mb.label}`}
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
