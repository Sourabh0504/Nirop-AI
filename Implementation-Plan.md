# Nirop-AI — Detailed Implementation Plan (Python / FastAPI)

This extends `Plan.md` (architecture/vision) with concrete, buildable detail: repo layout, schema, APIs, job design, and a milestone-by-milestone build order. Each milestone is meant to be built and verified on its own before moving to the next — this doc is a map, not a build order to execute all at once.

**Stack changed from the original Node/Next.js-only plan to Python/FastAPI for the backend**, specifically because AI features (variant generation now, and likely segmentation/engagement-scoring/content analysis later) are far more natural in the Python ecosystem — direct access to the OpenAI SDK, pandas/numpy, and any future ML tooling without a cross-language bridge. Frontend ended up as a vanilla Vite + TanStack Router app (not Next.js — see §9) to reuse the same component/design patterns as the Saarthi-CV dashboard without a Lovable.dev dependency.

---

## 1. Framework decisions

| Decision | Recommendation | Why |
|---|---|---|
| Backend API | **FastAPI** (Python) | Async-native, typed via Pydantic, easy to grow into AI-heavy endpoints. |
| Frontend | **Vite + React 19 + TanStack Router**, Tailwind v4 + Radix/shadcn-style components, calling FastAPI over REST | Reuses the proven Saarthi-CV stack/design system directly (owned in-repo, no Lovable.dev dependency), rather than starting a Next.js app from zero polish. |
| Queue / background jobs | **Celery + Redis** (broker + result backend), **Celery Beat** for cron-style jobs | Standard, mature Python task queue; Beat covers Sheets sync / bounce-check / warmup-tick cron needs. |
| ORM / migrations | **SQLAlchemy 2.0 (async)** + **Alembic** | Idiomatic FastAPI pairing, full control over schema (needed for the custom rate-limit/rotation logic). |
| Package manager | **uv** | Fast, modern, single lockfile. |
| SMTP sending | **smtplib** (stdlib) inside Celery tasks | Celery tasks are sync by default; no need for async SMTP there. |
| AI provider | **OpenAI API** via the `openai` Python SDK (chat completions, JSON mode) | User has an OpenAI key available; swapped from the originally planned Claude API. |
| Auth | **FastAPI + JWT** (`python-jose`, `passlib[bcrypt]`) | Simple, no need for a heavier auth framework at this scale. |
| Open/click tracking in V1 | **Defer to Phase 3.** | Tracking pixels/link-rewriting add spam-signal risk and complexity; V1 priority is deliverability. |
| AI scope in V1 | **Variant generation only** (10-12 subject/body variants, human-approved). No per-recipient dynamic personalization yet. | Matches Plan.md §12; future AI (segmentation, send-time optimization, engagement prediction) is easier to bolt on later precisely because the backend is already Python. |

---

## 2. Repo structure

```
nirop-ai/
  apps/
    web/                       # Next.js dashboard (TypeScript), calls FastAPI over REST
      src/app/...
    api/                       # FastAPI app + Celery workers (same codebase, two entrypoints)
      app/
        main.py                # FastAPI entrypoint (uvicorn app.main:app)
        core/
          config.py            # pydantic-settings env config
          security.py          # JWT, password hashing, SMTP-password AES-GCM encrypt/decrypt
          celery_app.py        # Celery app instance + Beat schedule
        models/                # SQLAlchemy models
        schemas/                # Pydantic request/response schemas
        api/
          routes/
            subscribers.py
            mailboxes.py
            campaigns.py
            auth.py
        services/
          dedupe.py
          sheets_sync.py
          ai_variants.py
          rate_limiter.py
          mailbox_rotation.py
          bounce_processor.py
        workers/
          tasks.py             # celery tasks: dispatch_campaign, send_email, sheets_sync, bounce_check, warmup_tick
      alembic/
      pyproject.toml
  docker-compose.yml            # postgres, redis, api (uvicorn), worker (celery), beat, web, nginx
  .env.example
```

Run modes from the same `apps/api` package:
- `uvicorn app.main:app` — the API server
- `celery -A app.core.celery_app worker -Q mailer,default -c 8` — the sending/task worker
- `celery -A app.core.celery_app beat` — the cron scheduler (sheets-sync, bounce-check, warmup-tick)

---

## 3. Database schema (SQLAlchemy 2.0)

```python
class SubscriberStatus(str, Enum):
    ACTIVE = "active"
    UNSUBSCRIBED = "unsubscribed"
    BOUNCED = "bounced"
    SUPPRESSED = "suppressed"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    CONTENT = "content"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class MailboxStatus(str, Enum):
    WARMING = "warming"
    ACTIVE = "active"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"

class SendStatus(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    FAILED = "failed"
    RETRYING = "retrying"

class BounceType(str, Enum):
    HARD = "hard"
    SOFT = "soft"


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str]
    role: Mapped[str] = mapped_column(default="editor")  # admin | editor | viewer
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class Subscriber(Base):
    __tablename__ = "subscribers"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    email: Mapped[str] = mapped_column(unique=True, index=True)  # stored lowercase
    first_name: Mapped[str | None]
    last_name: Mapped[str | None]
    source_site: Mapped[str]                          # "jobsociety" | "testingsociety"
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    status: Mapped[SubscriberStatus] = mapped_column(default=SubscriberStatus.ACTIVE, index=True)
    source_row_hash: Mapped[str | None]                # for incremental Sheets sync
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)


class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    name: Mapped[str]
    site: Mapped[str]
    status: Mapped[CampaignStatus] = mapped_column(default=CampaignStatus.DRAFT)
    batch_size: Mapped[int] = mapped_column(default=100)
    scheduled_at: Mapped[datetime | None]
    created_by: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    variants: Mapped[list["CampaignVariant"]] = relationship(back_populates="campaign")
    batches: Mapped[list["SendBatch"]] = relationship(back_populates="campaign")


class CampaignVariant(Base):
    __tablename__ = "campaign_variants"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"))
    variant_index: Mapped[int]
    subject: Mapped[str]
    html_body: Mapped[str]
    text_body: Mapped[str]
    approved: Mapped[bool] = mapped_column(default=False)

    campaign: Mapped["Campaign"] = relationship(back_populates="variants")

    __table_args__ = (UniqueConstraint("campaign_id", "variant_index"),)


class Mailbox(Base):
    __tablename__ = "mailboxes"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    label: Mapped[str]
    from_name: Mapped[str]
    from_email: Mapped[str]
    smtp_host: Mapped[str]
    smtp_port: Mapped[int]
    smtp_user: Mapped[str]
    smtp_pass_enc: Mapped[str]                        # AES-256-GCM encrypted
    daily_limit: Mapped[int] = mapped_column(default=50)
    warmup_stage: Mapped[int] = mapped_column(default=0)  # 0-3
    status: Mapped[MailboxStatus] = mapped_column(default=MailboxStatus.WARMING)


class MailboxUsageDaily(Base):
    __tablename__ = "mailbox_usage_daily"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    mailbox_id: Mapped[str] = mapped_column(ForeignKey("mailboxes.id"))
    date: Mapped[date]
    used_count: Mapped[int] = mapped_column(default=0)

    __table_args__ = (UniqueConstraint("mailbox_id", "date"),)


class SendBatch(Base):
    __tablename__ = "send_batches"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"))
    variant_id: Mapped[str] = mapped_column(ForeignKey("campaign_variants.id"))
    status: Mapped[str] = mapped_column(default="pending")  # pending | processing | done | failed
    scheduled_at: Mapped[datetime]

    campaign: Mapped["Campaign"] = relationship(back_populates="batches")
    events: Mapped[list["SendEvent"]] = relationship(back_populates="batch")


class SendEvent(Base):
    __tablename__ = "send_events"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    batch_id: Mapped[str] = mapped_column(ForeignKey("send_batches.id"))
    subscriber_id: Mapped[str] = mapped_column(ForeignKey("subscribers.id"))
    mailbox_id: Mapped[str] = mapped_column(ForeignKey("mailboxes.id"))
    status: Mapped[SendStatus] = mapped_column(default=SendStatus.QUEUED, index=True)
    error: Mapped[str | None]
    provider_message_id: Mapped[str | None]
    idempotency_key: Mapped[str] = mapped_column(unique=True)  # f"{campaign_id}:{batch_id}:{subscriber_id}"
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    batch: Mapped["SendBatch"] = relationship(back_populates="events")


class Unsubscribe(Base):
    __tablename__ = "unsubscribes"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    email: Mapped[str]
    reason: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


class BounceEvent(Base):
    __tablename__ = "bounce_events"
    id: Mapped[str] = mapped_column(primary_key=True, default=cuid)
    email: Mapped[str]
    type: Mapped[BounceType]
    reason: Mapped[str | None]
    raw_payload: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

---

## 4. API surface (FastAPI routers)

```
POST   /api/auth/login                 - JWT login
POST   /api/auth/refresh

GET    /api/subscribers                - list, filter by status/site
POST   /api/subscribers/sync           - trigger Sheets sync now (enqueues celery task)
GET    /api/subscribers/dedupe-report  - counts of dupes/suppressed
GET    /api/unsubscribe                - public unsubscribe landing (email + token query params)

GET    /api/mailboxes                  - list
POST   /api/mailboxes                  - create (encrypts SMTP pass server-side before storing)
PATCH  /api/mailboxes/{id}             - update status/limits
DELETE /api/mailboxes/{id}

GET    /api/campaigns                  - list
POST   /api/campaigns                  - create (draft)
GET    /api/campaigns/{id}
PATCH  /api/campaigns/{id}             - update fields/status
POST   /api/campaigns/{id}/variants/generate   - call OpenAI to generate 10-12 variants
PATCH  /api/campaigns/{id}/variants/{variant_id} - edit/approve a variant
POST   /api/campaigns/{id}/schedule    - enqueue dispatch_campaign celery task
POST   /api/campaigns/{id}/pause

GET    /api/campaigns/{id}/stats       - sent/failed/bounced/unsub counts
GET    /api/campaigns/{id}/batches
```

FastAPI gives OpenAPI docs for all of this for free at `/docs`, which is handy for testing endpoints during the milestone-by-milestone build.

---

## 5. Worker/queue design (Celery + Redis)

**Queues / periodic tasks (Celery Beat schedule):**
- `sheets_sync` — every 15 min, also triggerable on demand via the API.
- `bounce_check` — every 10 min, polls the IMAP bounce mailbox.
- `warmup_tick` — daily, advances each mailbox's `warmup_stage` and recalculates `daily_limit`.

**On-demand tasks:**
- `dispatch_campaign(campaign_id)` — expands the audience into `SendBatch` rows and enqueues one `send_email` task per recipient per batch.
- `send_email(send_event_id)` — sends a single email via `smtplib`, respecting rate limits below.

**Per-mailbox rate limiting** (Celery's built-in `rate_limit` is per task type per worker, not per dynamic mailbox — so this needs the same hand-rolled Redis token bucket as before, just via `redis-py`):
```python
def check_rate_limit(mailbox_id: str, per_minute_limit: int, daily_limit: int) -> bool:
    minute_key = f"mailbox:{mailbox_id}:minute:{int(time.time() // 60)}"
    day_key = f"mailbox:{mailbox_id}:day:{date.today()}"

    minute_count = redis.incr(minute_key)
    redis.expire(minute_key, 60)
    if minute_count > per_minute_limit:
        raise RateLimitedError()  # celery retries with countdown/backoff

    day_count = redis.incr(day_key)
    redis.expire(day_key, 86400)
    if day_count > daily_limit:
        set_mailbox_cooldown(mailbox_id)
        raise DailyLimitReachedError()  # requeue for tomorrow

    return True
```

**Mailbox selection:** at send time, query mailboxes where `status = ACTIVE` and today's `used_count < daily_limit`, pick the one with the lowest `used_count / daily_limit` ratio, skip cooldown/disabled ones.

**Idempotency:** `idempotency_key = f"{campaign_id}:{batch_id}:{subscriber_id}"`; `send_email` checks for an existing `SENT` event before sending, so Celery retries can't double-send.

**Variant assignment:** round-robin by subscriber index within the batch (`subscriber_index % variant_count`).

---

## 6. Google Sheets sync

- Service account (`google-api-python-client`) with read access to both sheets (JobSociety, TestingSociety).
- Pull rows, compute a hash per row (email+name+tags) into `source_row_hash` to detect changes and support incremental sync.
- Upsert into `Subscriber` by lowercase email; skip rows already `UNSUBSCRIBED`/`SUPPRESSED`.
- Log a per-sync summary (rows read, upserted, skipped-suppressed, invalid-email) surfaced on the dashboard.

---

## 7. AI variant generation

- `services/ai_variants.py` calls `OpenAI().chat.completions.create(..., response_format={"type": "json_object"})` with a prompt template.
- Instructs the model to: preserve all links/unsubscribe placeholders, vary subject/opening line, avoid spam-trigger words (checked against a static wordlist post-generation, server-side — not just prompt-level), keep length within ±20% of the original.
- Output stored as `CampaignVariant` rows with `approved = False`; a human must review/edit and mark approved before `POST /campaigns/{id}/schedule` is allowed to proceed (enforced in the route handler, not just the UI).
- Because this is already Python, future AI additions (subscriber segmentation, send-time optimization, engagement-based re-ranking) slot into the same `services/` layer without a new service or language boundary.

---

## 8. Deliverability implementation

- **DNS**: SPF (`v=spf1 include:hostinger... -all`), DKIM (per-domain selector via Hostinger), DMARC (`p=quarantine` initially, tighten to `p=reject` once stable). Document exact records per domain in a `DNS.md` once mailboxes are provisioned.
- **Warmup**: `warmup_stage` 0-3 maps to daily limits from Plan.md §10.2 (20-50 / 50-150 / 200-400 / 500-1000); `warmup_tick` advances stage weekly if bounce rate stays under threshold, holds/regresses otherwise.
- **List-Unsubscribe header** + visible footer link on every send, pointing to `/api/unsubscribe`.
- **Seed list**: a handful of monitored inboxes (Gmail/Outlook/Yahoo) included in every batch to eyeball inbox placement.

---

## 9. Frontend screens (Next.js, calling FastAPI)

- `/login`
- `/dashboard` — campaign status tiles, mailbox quota bars
- `/subscribers` — table + filters, dedupe report, manual sync button
- `/campaigns` — list + `/campaigns/new`, `/campaigns/:id` builder (content → variants → schedule → review)
- `/campaigns/:id/preview` — rendered HTML preview per variant
- `/mailboxes` — CRUD, warmup stage indicator
- `/logs` — send events, filterable by campaign/mailbox/status

Auth: Next.js stores the JWT (httpOnly cookie set by FastAPI on login) and forwards it on every API call.

---

## 10. Security

- SMTP passwords: AES-256-GCM via Python's `cryptography` library, key from `SMTP_ENCRYPTION_KEY` env var — never logged, never returned by any API response.
- RBAC: `admin` (mailboxes, users), `editor` (campaigns, subscribers), `viewer` (read-only) — enforced via a FastAPI dependency checking `User.role`.
- Audit log: append-only table logging who changed what on campaigns/mailboxes (Phase 2, not V1-critical).

---

## 11. Testing

- **Unit** (`pytest`): dedupe logic, rate-limiter token-bucket math, variant round-robin assignment, spam-wordlist filter.
- **Integration** (`pytest` + `httpx.AsyncClient`): FastAPI route tests against a test DB; SMTP send against a test inbox (Ethereal or a real Hostinger test mailbox); Sheets sync against a test sheet.
- **E2E** (Playwright, later): campaign builder happy path against the running Next.js + FastAPI stack.

---

## 12. Milestone build order

Each milestone should be scoped, built, and verified end-to-end before starting the next — do not jump ahead.

1. **DNS + mailbox provisioning** — SPF/DKIM/DMARC live for both domains, 2-3 mailboxes created, verified with a mail-tester.com score check. ⏸ Blocked on the user — nothing to do remotely here.
2. **Repo scaffold** — `uv`-managed FastAPI project, SQLAlchemy models above, Alembic initial migration, Postgres running locally via Docker. ✅ Done.
   - **Interim: Subscribers CRUD** (not a numbered milestone in the original plan) — manual add/list/delete with case-insensitive dedupe, done ahead of Sheets sync so the sending pipeline (milestones 4-6) has real test data without waiting on Google service-account setup. ✅ Done.
3. **CLI Sheets sync script** — standalone script (not yet wired to Celery): read one sheet, dedupe, upsert to DB. Verify against real sheet data. Needs a Google service account — still pending.
4-6. **Sender + rate limiter + mailbox rotation + Celery worker wiring** — merged into one delivery: `services/rate_limiter.py` (Redis token-bucket, per-minute + daily), `services/mailbox_rotation.py` (lowest-usage-ratio pick + `MailboxUsageDaily` tracking), `services/mailer.py` (smtplib), `workers/tasks.py` (`dispatch_campaign` + idempotent `send_email` with Celery retries), `POST /campaigns/{id}/send`. Verified end-to-end against a local **Mailpit** SMTP catcher (real Hostinger mailboxes still pending on milestone 1) — dispatch → rate limit → rotation → SMTP send → delivery all confirmed via Mailpit's API. ✅ Done (against test SMTP; swap to real mailboxes once milestone 1 lands).
7. **FastAPI + frontend skeleton** — auth, mailboxes CRUD screen only, wired to the real DB through FastAPI. ✅ Done.
8. **Campaign builder (manual content, no AI yet)** — create campaign, add variants manually, approve, send. ✅ Done, including send (originally deferred to milestone 6, now that it exists).
9. **AI variant generation** — OpenAI-backed generate endpoint + approval gate, guardrails catch spam-trigger wording. ✅ Done.
10. **Bounce processing** — IMAP bounce mailbox parsing, hard bounce suppression, verify against a deliberately bad test address. Needs a real bounce mailbox — pending milestone 1.
11. **Unsubscribe flow** — public endpoint + footer link, verify a real unsubscribe removes the address from future sends.
12. **Dashboard analytics/logs screen** — `GET /api/logs` + `GET /api/campaigns/{id}/stats` power a real Logs page and live campaign stats. ✅ Done.
13. **Warmup automation** — `warmup_tick` task, verify stage advancement logic on a mock mailbox with adjustable "days active." Meaningful once milestone 1's real mailboxes exist to warm up.

Phase 3 items (open/click tracking, advanced segmentation, re-engagement, and any further AI features) are deliberately out of this build order — revisit only after V1 is sending reliably.

---

## 13. Risks

- **Shared IP/domain reputation** across JobSociety and TestingSociety mailboxes — keep sending domains and warmup pools separate per site so one site's dirtier list doesn't cross-contaminate the other's reputation.
- **Google Sheets as source of truth for input** — a malformed manual edit in the sheet (e.g., bulk-pasted emails with typos) can degrade list quality fast; the sync's email-format validation is the only backstop, so log+surface invalid rows rather than silently dropping them.
- **Hand-rolled per-mailbox rate limiting** (Celery has no native per-dynamic-group limiter) — needs its own unit tests (§11) since a bug here directly risks provider throttling/blacklisting.
- **Sync vs async mismatch**: FastAPI is async-native but Celery tasks (and `smtplib`) are sync — keep the boundary clean (API layer async, Celery task layer sync) rather than mixing event loops inside tasks.
