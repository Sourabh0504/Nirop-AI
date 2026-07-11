/**
 * Fixed, decorative blurred color washes sitting behind page content.
 * Exists so glass surfaces (Card, Dialog, Dropdown, Topbar) have something
 * colorful to blur — translucency alone reads as "dimmed", not "glass".
 */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="animate-drift-a absolute -top-32 left-1/4 size-[30rem] rounded-full opacity-[0.16] blur-[110px]"
        style={{ background: "var(--chart-1)" }}
      />
      <div
        className="animate-drift-b absolute top-1/3 -right-24 size-[26rem] rounded-full opacity-[0.13] blur-[110px]"
        style={{ background: "var(--primary)" }}
      />
      <div
        className="absolute -bottom-24 left-1/3 size-[24rem] rounded-full opacity-[0.08] blur-[110px]"
        style={{ background: "var(--success)" }}
      />
    </div>
  );
}
