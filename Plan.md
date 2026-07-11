# Architecture & Plan for an AI-Powered SMTP Newsletter System

## 1. Goals, Constraints, and Non-Negotiables
- Own the full email delivery stack (no Mailchimp-type SaaS), but still use reliable SMTP mailboxes (e.g., Hostinger) connected via SMTP.
- Primary priority for V1: deliverability and inbox placement, not volume or complex AI.
- Target scale: 10k-100k subscribers across JobSociety.in and TestingSociety.com.
- Daily per-mailbox limit: about 1,000 emails/day; multiple domain mailboxes used in rotation.
- Recipients list lives in Google Sheets, with strict deduplication logic.
- Each send uses batches of about 100 users and 10-12 content variants per newsletter.
- Tech preference: full custom web app with Node.js/Next.js-style stack and modern UI.
# Project Plan: AI-Powered SMTP Newsletter System

## 1. Summary
Build a self-owned newsletter system that sends job updates for JobSociety.in and TestingSociety.com using your own SMTP mailboxes. The system will prioritize deliverability, list hygiene, and controlled sending. It will sync recipients from Google Sheets, deduplicate them, generate 10-12 content variants per campaign, and send in batches of 100 with strict rate limiting and mailbox rotation.

## 2. Goals and Success Metrics
### 2.1 Goals
- Own the full sending pipeline (no Mailchimp-type SaaS).
- Deliverability first: stable inbox placement is more important than raw volume.
- Support 10k-100k subscribers across two sites.
- Use multiple Hostinger mailboxes, each capped at 1000 emails/day.
- Reduce spam risk with throttling, warmup, and list hygiene.

### 2.2 Success Metrics
- Hard bounce rate < 2 percent per campaign.
- Spam complaint rate < 0.1 percent.
- Unsubscribe rate < 1 percent for engaged segments.
- Daily send targets met without mailbox throttling errors.

## 3. Constraints and Non-Negotiables
- Google Sheets is the input source for subscribers.
- Final dedupe happens in the database (case-insensitive email uniqueness).
- Batches are capped at 100 recipients.
- Each campaign uses 10-12 content variants.
- Per-mailbox daily limit is respected with rotation.

## 4. Recommended Tech Stack (Fast to Build)
- Frontend: Next.js (React) with Tailwind CSS.
- Backend API: Node.js (NestJS or Fastify).
- Database: PostgreSQL with Prisma ORM.
- Queue and rate limits: Redis + BullMQ.
- SMTP: Hostinger mailboxes via Nodemailer.
- Google Sheets: Sheets API for list sync.
- Auth: NextAuth or JWT-based auth.
- Deployment: Docker on a VPS with Nginx and SSL.

## 5. High-Level Architecture
### 5.1 Services
- Web app: UI for campaigns, lists, templates, mailboxes, logs.
- API server: auth, list sync, campaign orchestration, analytics.
- Worker service: SMTP sending, retries, throttling, rotation.
- Queue: scheduled batch jobs and rate limit counters.
- Database: canonical records and history.
- Bounce processor: parses bounce mailbox (IMAP) and updates status.

### 5.2 Data Flow
1. Google Sheets sync -> subscribers upserted into DB.
2. Campaign created -> template variants generated.
3. Scheduler splits audience into batches of 100 -> enqueue jobs.
4. Worker processes jobs -> selects mailbox -> sends via SMTP.
5. Results logged -> dashboard updated.
6. Bounce processor updates hard/soft bounce status.

## 6. Data Model (Core)
- users: id, email, role, password_hash, created_at
- subscribers: id, email (unique), first_name, last_name, source_site, tags, status, created_at, updated_at
- campaigns: id, name, site, schedule, status, batch_size, created_by
- campaign_variants: id, campaign_id, subject, html_body, text_body, variant_index
- mailboxes: id, label, from_name, from_email, smtp_host, smtp_port, smtp_user, smtp_pass, daily_limit, warmup_stage, status
- mailbox_usage_daily: id, mailbox_id, date, used_count
- send_batches: id, campaign_id, variant_id, status, scheduled_at
- send_events: id, batch_id, subscriber_id, mailbox_id, status, error, provider_message_id, created_at
- unsubscribes: id, email, reason, created_at
- bounce_events: id, email, type, reason, raw_payload, created_at

## 7. Google Sheets Sync and Dedupe
### 7.1 Sync Strategy
- Treat Sheets as input only, DB as source of truth for sending.
- Track row hash or updated timestamp to enable incremental sync.
- Validate email format before insert.

### 7.2 Dedupe Rules
- Email uniqueness is case-insensitive.
- Suppressed or unsubscribed emails are never re-added.
- If duplicates exist across sites, keep the most recent and merge tags.

## 8. Campaign Workflow
1. Draft: choose site, list source, and sender pool.
2. Content: paste base template and generate variants.
3. Schedule: choose send window and batch size.
4. Review: approve content and compliance.
5. Active: batches queued and processed.
6. Completed: summary metrics and logs.

## 9. Sending Engine Design
### 9.1 Batch and Variant Assignment
- Split audience into batches of 100.
- Assign variants round-robin to spread content evenly.

### 9.2 Rate Limiting
- Per mailbox: 20-40 emails per minute (configurable).
- Per domain: 100-200 emails per minute (configurable).
- Add random jitter (5-15 seconds) between messages.

### 9.3 Mailbox Rotation
- Select mailbox with the lowest used quota.
- Skip mailboxes that exceeded daily limit or are in cooldown.

### 9.4 Retry Policy
- 4xx errors: retry with exponential backoff.
- 5xx errors: mark as failed and suppress if permanent.

### 9.5 Idempotency
- Each send event has a unique key to prevent duplicate sends.
- Failed jobs can be retried without double-sending.

## 10. Deliverability Playbook
### 10.1 DNS and Authentication
- SPF, DKIM, and DMARC for each domain.
- Align From domain with DKIM signing domain.
- Enable TLS for all SMTP sends.

### 10.2 Warmup
- Week 1: 20-50 emails/day per mailbox.
- Week 2: 50-150/day.
- Week 3: 200-400/day.
- Week 4: 500-1000/day.
- Always start with highly engaged recipients.

### 10.3 Content Rules
- Include plain text alternative for every email.
- Avoid spam-trigger wording and excessive punctuation.
- Honest, value-driven subjects (job updates).

### 10.4 List Hygiene
- Remove hard bounces immediately.
- Sunset inactive users after 6-12 months.
- Maintain a seed list to monitor inbox placement.

## 11. Unsubscribe and Bounce Handling
- Every email includes an unsubscribe link.
- Add List-Unsubscribe header for better deliverability.
- Use a dedicated bounce mailbox and parse bounces via IMAP.
- Hard bounce -> suppress permanently.
- Soft bounce -> retry a limited number of times.

## 12. AI Variant Generation
- Generate 10-12 subject and body variants per campaign.
- Guardrails: no spammy words, keep length similar, retain brand tone.
- Require human review before scheduling.

## 13. UI Screens (V1)
- Login
- Dashboard (campaign status, mailbox usage)
- Subscribers (list view, dedupe report)
- Campaign builder
- Template editor + preview
- Logs and analytics
- Mailbox settings

## 14. Security and Compliance
- Encrypt SMTP credentials at rest.
- Role-based access control.
- Audit log for campaign changes.
- Clear opt-in language and privacy policy.
- Honor unsubscribe immediately across both sites.

## 15. Monitoring and Alerts
- Track sent, failed, bounced, and unsubscribed counts.
- Alert if bounce rate or failure rate exceeds threshold.
- Daily report per mailbox showing quota usage.

## 16. Deployment
- Docker containers for web, API, worker, and Redis.
- Nginx reverse proxy with SSL.
- Daily Postgres backups.
- Separate staging environment for testing.

## 17. Testing and QA
- Unit tests: dedupe logic, batching, rate limiting.
- Integration tests: SMTP sending with test inboxes.
- Deliverability tests with seed accounts.
- Load tests on small batches first.

## 18. Roadmap
### Phase 0 (1-2 weeks)
- DNS setup for SPF, DKIM, DMARC.
- Create 3-5 mailboxes per domain.
- Basic Sheets sync script and warmup.

### Phase 1 (2-4 weeks)
- Build DB schema and API.
- Build CLI send script with batching and throttling.
- Validate deliverability with seed list.

### Phase 2 (3-5 weeks)
- Build web dashboard and campaign builder.
- Add BullMQ queue and worker service.
- Add AI variant generation.

### Phase 3 (ongoing)
- Bounce parsing and reputation monitoring.
- Advanced segmentation and re-engagement.

## 19. Open Decisions
- Final framework choice: NestJS vs Fastify.
- Whether to add open and click tracking in V1.
- How advanced AI personalization should be in V1.

## 20. Next Actions
- Confirm stack and hosting target.
- Set up DNS authentication for both domains.
- Build the Sheets sync + dedupe prototype.
- Create the CLI sender to prove deliverability.
- Add BullMQ queue and workers.
