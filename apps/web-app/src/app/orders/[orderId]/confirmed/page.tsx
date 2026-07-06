import { Button, SectionHeading } from "@/components/common";
import { ETicketCard } from "@/components/screens";

export default function ConfirmedPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-secondary">
            Xác nhận đơn hàng
          </p>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-on-surface">
            Vé của bạn đã sẵn sàng
          </h1>
        </div>
        <Button href="/my-tickets" variant="soft">
          Mở thư viện vé
        </Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <ETicketCard />
        <div className="space-y-6">
          <SectionHeading
            title="Các bước tiếp theo"
            description="Lưu giữ mã QR của bạn, chuẩn bị sẵn sàng và đến địa điểm trước khi giờ mở cửa bắt đầu."
          />
          <div className="grid gap-4">
            {[
              ["Thời gian đến", "Cổng soát vé sẽ mở trước giờ biểu diễn 90 phút."],
              [
                "Lưu trữ vé",
                "Chụp lại màn hình mã QR hoặc lưu mã vào thiết bị di động của bạn để quét nhanh hơn.",
              ],
              [
                "Hỗ trợ",
                "Liên hệ với ban tổ chức hoặc đội ngũ hỗ trợ ngay lập tức nếu mã QR của bạn không thể quét được tại lối vào.",
              ],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-outline-variant bg-surface p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {title}
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
