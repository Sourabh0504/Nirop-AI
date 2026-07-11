import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: Login,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit() {
    // Backend auth endpoint not wired yet — placeholder for milestone 7.
    toast.info("Auth isn't wired up yet — dropping you into the dashboard shell.");
    await navigate({ to: "/" });
  }

  return (
    <div className="bg-background flex min-h-screen">
      <div className="border-border/70 relative hidden w-1/2 flex-col justify-between overflow-hidden border-r bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-lg font-semibold">Nirop AI</span>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-white">
            Own your sending pipeline, end to end.
          </h2>
          <p className="text-sidebar-foreground/60 max-w-sm text-sm">
            Deliverability-first email for JobSociety.in and TestingSociety.com — mailbox
            rotation, warmup, and AI-assisted variants, without a SaaS middleman.
          </p>
        </div>

        <p className="text-sidebar-foreground/40 text-xs">&copy; {new Date().getFullYear()} Nirop AI</p>

        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--sidebar-primary), transparent 70%)" }}
        />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-muted-foreground text-sm">Welcome back — enter your credentials to continue.</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@nirop.ai" {...register("email")} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
