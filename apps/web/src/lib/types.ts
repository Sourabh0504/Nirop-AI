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
