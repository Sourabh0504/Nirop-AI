import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    try {
      await api.get<User>("/api/auth/me");
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AmbientBackground />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="animate-in-up mx-auto max-w-[1400px] p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
