import { CountdownTimer } from "@/components/screens";
import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = {
  title: "Secure Checkout — TicketBox",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Secure Checkout
            </span>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
            Complete your order
          </h1>
          <p className="mt-2 text-sm font-mono text-on-surface-variant">
            Reservation ID:{" "}
            <span className="text-on-surface/70">{orderId}</span>
          </p>
        </div>
        <CountdownTimer orderId={orderId} />
      </div>

      {/* ── Two-column grid ───────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <CheckoutForm orderId={orderId} />
      </div>
    </section>
  );
}
