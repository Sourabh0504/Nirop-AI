import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Mailbox, MailboxCreateInput } from "@/lib/types";

const MAILBOXES_KEY = ["mailboxes"];

export function useMailboxes() {
  return useQuery({
    queryKey: MAILBOXES_KEY,
    queryFn: () => api.get<Mailbox[]>("/api/mailboxes"),
  });
}

export function useCreateMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MailboxCreateInput) => api.post<Mailbox>("/api/mailboxes", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAILBOXES_KEY });
    },
  });
}

export function useDeleteMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/mailboxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MAILBOXES_KEY });
    },
  });
}
