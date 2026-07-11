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

export type CampaignStatus = "draft" | "content" | "scheduled" | "active" | "paused" | "completed";

export interface Campaign {
  id: string;
  name: string;
  site: string;
  status: CampaignStatus;
  batch_size: number;
  scheduled_at: string | null;
  pause_reason: string | null;
  created_by: string;
  created_at: string;
}

export interface CampaignVariant {
  id: string;
  campaign_id: string;
  variant_index: number;
  subject: string;
  html_body: string;
  text_body: string;
  approved: boolean;
}

export interface CampaignDetail extends Campaign {
  variants: CampaignVariant[];
}

export interface CampaignCreateInput {
  name: string;
  site: string;
}

export interface VariantCreateInput {
  subject: string;
  html_body: string;
  text_body: string;
}

export interface VariantGenerateInput {
  base_subject: string;
  base_html_body: string;
  base_text_body: string;
  count: number;
}

export interface VariantGenerateResult {
  variants: CampaignVariant[];
  flagged_count: number;
}

export type SubscriberStatus = "active" | "unsubscribed" | "bounced" | "suppressed";

export interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  status: SubscriberStatus;
  created_at: string;
}

export interface SubscriberCreateInput {
  email: string;
  first_name?: string;
  last_name?: string;
  tags: string[];
}

export interface DedupeReport {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  suppressed: number;
}

export type SendEventStatus = "queued" | "sent" | "failed" | "retrying";

export interface SendEventLog {
  id: string;
  status: SendEventStatus;
  error: string | null;
  created_at: string;
  campaign_name: string;
  subscriber_email: string;
  mailbox_label: string | null;
}

export interface CampaignStats {
  queued: number;
  sent: number;
  failed: number;
  retrying: number;
  opened: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}
