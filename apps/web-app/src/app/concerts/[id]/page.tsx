import { Button, Card, SectionHeading, SiteShell } from "@/components/common";
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
            <Card className="overflow-hidden border-0 shadow-md bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-on-surface">
                  Select Section
                </h2>
              </div>

              <SeatMapViewer mapUrl={concert.mapUrl} />
            </Card>

            <Card className="overflow-hidden border-0 shadow-md bg-surface p-6 sm:p-8">
              <SectionHeading
                eyebrow="About the show"
                title="Event Details"
                description={concert.description || "No description provided."}
              />

              {concert.aiBio && (
                <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-100 text-sm text-purple-900">
                  <p className="font-semibold text-xs uppercase tracking-wider text-purple-700 mb-1">
                    AI Generated Bio
                  </p>
                  <p>{concert.aiBio}</p>
                </div>
              )}

              <div className="mt-8 grid gap-4 grid-cols-2">
                {[
                  ["Show Date", concert.date],
                  ["Show Time", concert.time || "TBA"],
                  ["Venue", concert.venue],
                  ["City", concert.city || "TBA"],
                  ["Status", concert.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-outline-variant bg-surface-low p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
                      {label}
                    </p>
                    <p
                      className="mt-2 text-sm font-bold text-on-surface truncate"
                      title={value}
                    >
                      {value}
                    </p>
                  </div>
                ))}
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
