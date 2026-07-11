export interface User {
  id: string;
  email: string;
  role: string;
}

export type MailboxStatus = "warming" | "active" | "cooldown" | "disabled";

export interface Mailbox {
  id: string;
  label: string;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  daily_limit: number;
  warmup_stage: number;
  status: MailboxStatus;
}

export interface MailboxCreateInput {
  label: string;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  daily_limit: number;
}
