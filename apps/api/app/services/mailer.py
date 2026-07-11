import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.security import decrypt_secret
from app.models.models import Mailbox


def send_email_smtp(
    mailbox: Mailbox,
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str,
    unsubscribe_url: str,
) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{mailbox.from_name} <{mailbox.from_email}>"
    msg["To"] = to_email
    # RFC 8058 one-click unsubscribe: mail clients (Gmail, Yahoo, etc.) show a native
    # "Unsubscribe" button that POSTs here directly, no page load required.
    msg["List-Unsubscribe"] = f"<{unsubscribe_url}>"
    msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(mailbox.smtp_host, mailbox.smtp_port, timeout=10) as smtp:
        smtp.ehlo()
        if smtp.has_extn("starttls"):
            smtp.starttls()
            smtp.ehlo()
        if mailbox.smtp_user:
            password = decrypt_secret(mailbox.smtp_pass_enc)
            try:
                smtp.login(mailbox.smtp_user, password)
            except smtplib.SMTPException:
                pass  # server doesn't require auth (e.g. local Mailpit catcher)
        smtp.sendmail(mailbox.from_email, [to_email], msg.as_string())
