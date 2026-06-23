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
              Error Loading Concert
            </h1>
            <p className="text-on-surface-variant">
              {error instanceof Error
                ? error.message
                : "Failed to load concert details."}
            </p>
            <Button href="/" variant="primary">
              Back to Home
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
            {/* ── Select Section ── */}
            <Card className="overflow-hidden border-0 shadow-md bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-on-surface">
                  Select Section
                </h2>
              </div>
              <SeatMapViewer mapUrl={concert.mapUrl} />
            </Card>

            {/* ── About the show ── */}
            <Card className="overflow-hidden border-0 bg-surface shadow-lg shadow-black/20 px-7 py-6 sm:px-8 sm:py-7">
              {/* Eyebrow */}
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40">
                About the show
              </p>

              <div className="mt-4 divide-y divide-outline-variant/25">
                {/* ── Description ── */}
                {concert.description ? (
                  <div className="flex gap-5 pb-7">
                    <span
                      aria-hidden
                      className="font-display select-none text-[52px] font-black leading-none text-on-surface/[0.07]"
                    >
                      01
                    </span>
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/50">
                        Description
                      </p>
                      <p className="mt-2.5 text-[15px] leading-[1.8] text-on-surface-variant">
                        {concert.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  !concert.aiBio && (
                    <p className="py-6 text-sm italic text-on-surface-variant/40">
                      No description provided.
                    </p>
                  )
                )}

                {/* ── AI Bio ── */}
                {concert.aiBio && (
                  <div className="flex gap-5 pt-7">
                    <span
                      aria-hidden
                      className="font-display select-none text-[52px] font-black leading-none text-secondary/[0.18]"
                    >
                      02
                    </span>
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary-container/70">
                        ✦&nbsp; AI Generated Bio
                      </p>
                      <p className="mt-2.5 text-[15px] italic leading-[1.8] text-on-surface-variant/80">
                        {concert.aiBio}
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
