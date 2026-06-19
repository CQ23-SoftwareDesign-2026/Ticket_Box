import { Suspense } from "react";
import { Button } from "@/components/common";
import {
  CustomerInfoForm,
  OrderSummaryCard,
  PaymentMethodPicker,
  CountdownTimer,
} from "@/components/screens";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            Secure checkout
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-on-surface">
            Complete your order
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Reservation {orderId}
          </p>
        </div>
        <CountdownTimer orderId={orderId} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <CustomerInfoForm />
          <PaymentMethodPicker />
          <div className="flex flex-wrap gap-3">
            <Button href={`/checkout/${orderId}/processing`}>Pay now</Button>
            <Button
              href="/"
              variant="ghost"
              className="border border-outline-variant"
            >
              Back to Home
            </Button>
          </div>
        </div>
        <Suspense
          fallback={
            <div className="p-6 border rounded-3xl bg-white shadow">
              Loading summary...
            </div>
          }
        >
          <OrderSummaryCard />
        </Suspense>
      </div>
    </section>
  );
}
