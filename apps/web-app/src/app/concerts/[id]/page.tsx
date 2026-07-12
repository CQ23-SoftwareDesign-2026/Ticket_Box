import { Button, Card, SiteShell } from "@/components/common";
import {
  ConcertDetailHero,
  InteractiveTicketSelector,
  SeatMapViewer,
} from "@/components/screens";

import { getConcertById } from "@/services/concert.service";

export default async function ConcertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let concert;
  try {
    concert = await getConcertById(id);
  } catch (error) {
    return (
      <SiteShell active="/">
        <section className="mx-auto w-full max-w-7xl px-4 py-12 text-center">
          <Card className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-rose-600">
              Lỗi tải thông tin sự kiện
            </h1>
            <p className="text-on-surface-variant">
              {error instanceof Error
                ? error.message
                : "Không thể kết nối đến máy chủ lúc này."}
            </p>
            <Button href="/" variant="primary">
              Quay lại Trang chủ
            </Button>
          </Card>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell active="/">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ConcertDetailHero concert={concert} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div className="space-y-8">
            {/* ── About the show ── */}
            <Card className="overflow-hidden border-0 bg-surface shadow-lg shadow-black/20 px-7 py-6 sm:px-8 sm:py-7">
              {/* Eyebrow */}
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                Thông tin chi tiết
              </p>

              <div className="mt-4 divide-y divide-outline-variant/25">
                {/* ── Performers ── */}
                {concert.performers && concert.performers.length > 0 && (
                  <div className="flex flex-col pb-7">
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                        Nghệ sĩ biểu diễn
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {concert.performers.map((artist) => (
                          <span
                            key={artist}
                            className="inline-flex items-center rounded-xl bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary border border-primary/20"
                          >
                            {artist}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Description ── */}
                {concert.description ? (
                  <div className="flex flex-col py-7">
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                        Giới thiệu
                      </p>
                      <p className="mt-2.5 text-[15px] leading-[1.8] text-on-surface-variant">
                        {concert.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  !concert.aiBio && (
                    <p className="py-6 text-sm italic text-on-surface-variant/40">
                      Chưa có mô tả chi tiết cho sự kiện này.
                    </p>
                  )
                )}

                {/* ── AI Bio ── */}
                {concert.aiBio && (
                  <div className="flex flex-col pt-7">
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                        ✦&nbsp; Phân tích & Tóm tắt bởi AI
                      </p>
                      <p className="mt-2.5 text-[15px] italic leading-[1.8] text-on-surface-variant/80">
                        {concert.aiBio}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── Select Section ── */}
            <Card className="overflow-hidden border-0 shadow-md bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-on-surface">
                  Sơ đồ khu vực vé
                </h2>
              </div>
              <SeatMapViewer mapUrl={concert.mapUrl} />
            </Card>
          </div>

          <div className="sticky top-8">
            <InteractiveTicketSelector concert={concert} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
