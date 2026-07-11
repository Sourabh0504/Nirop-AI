import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CampaignStats, SendEventLog } from "@/lib/types";

export function useLogs() {
  return useQuery({
    queryKey: ["logs"],
    queryFn: () => api.get<SendEventLog[]>("/api/logs"),
    refetchInterval: 10_000,
  });
}

export function useCampaignStats(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "stats"],
    queryFn: () => api.get<CampaignStats>(`/api/campaigns/${campaignId}/stats`),
    enabled: !!campaignId,
    refetchInterval: 5_000,
  });
}
