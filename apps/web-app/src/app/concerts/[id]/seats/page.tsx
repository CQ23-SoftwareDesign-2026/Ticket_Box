import { Button, Card, SectionHeading, SiteShell } from "@/components/common";
import {
  FloatingCheckoutBar,
  SeatLegendCard,
  VenueMap,
} from "@/components/screens";

export default function SeatsPage() {
  return (
    <SiteShell active="/">
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Chọn chỗ ngồi"
          title="Chọn vị trí của bạn"
          description="Lựa chọn từ các chỗ ngồi GA hoặc VIP Lounge còn trống, sau đó tiến hành thanh toán trước khi thời gian giữ vé kết thúc."
          action={<Button href="/checkout/order-2048">Tiếp tục</Button>}
        />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <VenueMap />
            <SeatLegendCard />
          </div>
          <Card className="space-y-5 p-6 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                Đặt giữ vé
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-on-surface">
                Đã chọn 2 chỗ ngồi
              </h2>
            </div>
            <div className="rounded-2xl bg-surface-low p-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">VIP Lounge</p>
              <p className="mt-1">Hàng B · Ghế 4 và 5</p>
            </div>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center justify-between">
                <span>Giá vé</span>
                <span>$298.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Phí dịch vụ</span>
                <span>$18.00</span>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-3 text-base font-semibold text-on-surface">
                <span>Tổng cộng</span>
                <span>$316.00</span>
              </div>
            </div>
            <Button href="/checkout/order-2048" className="w-full">
              Tiến hành thanh toán
            </Button>
          </Card>
        </div>
      </section>
      <FloatingCheckoutBar />
    </SiteShell>
  );
}
