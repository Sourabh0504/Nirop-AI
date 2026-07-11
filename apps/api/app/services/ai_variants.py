import json

from anthropic import Anthropic

from app.core.config import get_settings

settings = get_settings()

SPAM_TRIGGER_WORDS = [
    "free money", "act now", "click here", "guarantee", "no obligation",
    "risk-free", "winner", "cash prize", "100% free", "buy now",
    "limited time", "urgent", "congratulations", "viagra", "casino",
    "make money fast", "work from home", "you have been selected",
]


class VariantGenerationError(Exception):
    pass


def flag_spam_words(text: str) -> list[str]:
    lowered = text.lower()
    return [word for word in SPAM_TRIGGER_WORDS if word in lowered]


def _build_prompt(base_subject: str, base_html_body: str, base_text_body: str, count: int) -> str:
    return f"""You are writing subject/body variants for a job-update newsletter. \
Given a base email below, produce {count} distinct variants as a JSON array.

Rules:
- Each variant must preserve every link and the unsubscribe placeholder from the base body exactly.
- Vary the subject line and opening line meaningfully across variants — do not just reorder words.
- Never use spam-trigger phrasing (e.g. "act now", "click here", "guaranteed", "free money", "winner").
- Keep each variant's length within about 20% of the base body's length.
- Keep the tone honest and value-driven — this is a legitimate job-update newsletter, not a promotion.

Base subject: {base_subject}

Base HTML body:
{base_html_body}

Base text body:
{base_text_body}

Respond with ONLY a JSON array of {count} objects, each shaped exactly like:
{{"subject": "...", "html_body": "...", "text_body": "..."}}
No prose, no markdown fences — just the raw JSON array."""


def generate_variants(
    base_subject: str, base_html_body: str, base_text_body: str, count: int = 10
) -> list[dict]:
    if not settings.anthropic_api_key:
        raise VariantGenerationError("ANTHROPIC_API_KEY is not configured")

    client = Anthropic(api_key=settings.anthropic_api_key)
    prompt = _build_prompt(base_subject, base_html_body, base_text_body, count)

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = "".join(block.text for block in response.content if block.type == "text").strip()

    try:
        variants = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise VariantGenerationError(f"Model did not return valid JSON: {exc}") from exc

    if not isinstance(variants, list):
        raise VariantGenerationError("Model response was not a JSON array")

    cleaned: list[dict] = []
    for item in variants:
        if not all(key in item for key in ("subject", "html_body", "text_body")):
            continue
        cleaned.append(
            {
                "subject": item["subject"],
                "html_body": item["html_body"],
                "text_body": item["text_body"],
                "spam_flags": flag_spam_words(item["subject"] + " " + item["text_body"]),
            }
        )

    if not cleaned:
        raise VariantGenerationError("Model returned no usable variants")

    return cleaned
