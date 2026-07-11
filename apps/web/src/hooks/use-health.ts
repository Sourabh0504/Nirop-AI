import { useQuery } from "@tanstack/react-query";
import { api, type HealthResponse } from "@/lib/api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<HealthResponse>("/health"),
    retry: 1,
    refetchInterval: 30_000,
  });
}
