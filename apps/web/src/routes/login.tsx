import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

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
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    try {
      await login.mutateAsync(values);
      await navigate({ to: "/" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Unable to sign in";
      toast.error(message || "Invalid email or password");
    }
  }

  return (
    <div className="bg-background flex min-h-screen">
      <div className="border-border/70 relative hidden w-1/2 flex-col justify-between overflow-hidden border-r bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex items-center gap-2">
          <div className="bg-sidebar-primary font-display flex size-8 items-center justify-center rounded-lg text-base font-bold text-white">
            N
          </div>
          <span className="font-display text-lg font-semibold">Nirop AI</span>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <h2 className="font-display max-w-md text-3xl font-semibold tracking-tight text-white">
            Own your sending pipeline, end to end.
          </h2>
          <p className="text-sidebar-foreground/60 max-w-sm text-sm">
            Deliverability-first email for JobSociety.in and TestingSociety.com — mailbox
            rotation, warmup, and AI-assisted variants, without a SaaS middleman.
          </p>
        </div>

        <p className="text-sidebar-foreground/40 relative z-10 text-xs">
          &copy; {new Date().getFullYear()} Nirop AI
        </p>

        <div
          className="motion-safe:animate-pulse pointer-events-none absolute -top-24 -right-24 size-96 rounded-full opacity-20 blur-3xl [animation-duration:6s]"
          style={{ background: "radial-gradient(circle, var(--sidebar-primary), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--sidebar-primary), transparent 70%)" }}
        />
      </div>

      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden px-6 lg:w-1/2">
        <div
          className="pointer-events-none absolute -top-20 right-0 size-80 rounded-full opacity-[0.1] blur-[100px]"
          style={{ background: "var(--chart-1)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full opacity-[0.08] blur-[100px]"
          style={{ background: "var(--primary)" }}
          aria-hidden="true"
        />

        <div className="surface-elevated bg-card/60 border-border/40 relative flex w-full max-w-sm flex-col gap-6 rounded-2xl border p-8 backdrop-blur-xl backdrop-saturate-150">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-xl font-semibold tracking-tight">Sign in</h1>
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

            <Button type="submit" disabled={isSubmitting || login.isPending} className="mt-2">
              {(isSubmitting || login.isPending) && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
