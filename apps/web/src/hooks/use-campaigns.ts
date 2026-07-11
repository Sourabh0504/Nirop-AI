import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Campaign,
  CampaignCreateInput,
  CampaignDetail,
  CampaignVariant,
  VariantCreateInput,
  VariantGenerateInput,
  VariantGenerateResult,
} from "@/lib/types";

const CAMPAIGNS_KEY = ["campaigns"];
const campaignKey = (id: string) => ["campaigns", id];

export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKey(id),
    queryFn: () => api.get<CampaignDetail>(`/api/campaigns/${id}`),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CampaignCreateInput) => api.post<Campaign>("/api/campaigns", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useSendCampaign(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<Campaign>(`/api/campaigns/${campaignId}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useCreateVariant(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VariantCreateInput) =>
      api.post<CampaignVariant>(`/api/campaigns/${campaignId}/variants`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
    },
  });
}

export function useGenerateVariants(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VariantGenerateInput) =>
      api.post<VariantGenerateResult>(`/api/campaigns/${campaignId}/variants/generate`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
    },
  });
}

export function useUpdateVariant(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, approved }: { variantId: string; approved: boolean }) =>
      api.patch<CampaignVariant>(`/api/campaigns/${campaignId}/variants/${variantId}`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
    },
  });
}

export function useDeleteVariant(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) => api.delete(`/api/campaigns/${campaignId}/variants/${variantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKey(campaignId) });
    },
  });
}
