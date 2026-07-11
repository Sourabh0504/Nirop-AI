/**
 * Fixed, vividly-colored blurred mesh sitting behind page content — the
 * whole reason glass panels read as "glass" instead of "dimmed". Canonical
 * glassmorphism needs a genuinely colorful backdrop; faint 10%-opacity
 * blobs are invisible under a blurred translucent card and defeat the effect.
 */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-drift-a absolute -top-40 -left-20 size-[44rem] rounded-full opacity-60 blur-[90px] dark:opacity-45"
        style={{ background: "var(--chart-1)" }}
      />
      <div
        className="animate-drift-b absolute top-10 -right-32 size-[40rem] rounded-full opacity-50 blur-[90px] dark:opacity-40"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="animate-drift-a absolute bottom-[-12rem] left-1/4 size-[38rem] rounded-full opacity-45 blur-[90px] [animation-delay:-8s] dark:opacity-35"
        style={{ background: "var(--success)" }}
      />
      <div
        className="animate-drift-b absolute right-1/4 bottom-0 size-[30rem] rounded-full opacity-35 blur-[90px] [animation-delay:-4s] dark:opacity-25"
        style={{ background: "var(--warning)" }}
      />
    </div>
  );
}
