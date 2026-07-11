import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DedupeReport, Subscriber, SubscriberCreateInput } from "@/lib/types";

const SUBSCRIBERS_KEY = ["subscribers"];
const DEDUPE_KEY = ["subscribers", "dedupe-report"];

export function useSubscribers() {
  return useQuery({
    queryKey: SUBSCRIBERS_KEY,
    queryFn: () => api.get<Subscriber[]>("/api/subscribers"),
  });
}

export function useDedupeReport() {
  return useQuery({
    queryKey: DEDUPE_KEY,
    queryFn: () => api.get<DedupeReport>("/api/subscribers/dedupe-report"),
  });
}

export function useCreateSubscriber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubscriberCreateInput) => api.post<Subscriber>("/api/subscribers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_KEY });
      queryClient.invalidateQueries({ queryKey: DEDUPE_KEY });
    },
  });
}

export function useDeleteSubscriber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/subscribers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIBERS_KEY });
      queryClient.invalidateQueries({ queryKey: DEDUPE_KEY });
    },
  });
}
