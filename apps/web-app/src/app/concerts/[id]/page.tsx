import { Button, Card, SectionHeading, SiteShell } from "@/components/common";
import {
  ConcertDetailHero,
  InteractiveTicketSelector,
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
            <p className="text-slate-600">
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
            <Card className="overflow-hidden border-0 shadow-md bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-gray-900">
                  Select Section
                </h2>
              </div>

              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center min-h-[300px]">
                {concert.mapUrl &&
                concert.mapUrl !==
                  "https://cdn.ticketbox.local/maps/default.svg" ? (
                  <img
                    src={concert.mapUrl}
                    alt="Seat Map"
                    className="w-full h-auto max-h-[350px] object-contain"
                  />
                ) : (
                  <img
                    src="/mock/seat_map.svg"
                    alt="Seat Map"
                    className="w-full h-auto max-h-[350px] object-contain"
                  />
                )}
                <div className="mt-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto mb-2 text-gray-400"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-700">
                    Interactive Map Canvas
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-0 shadow-md bg-white p-6 sm:p-8">
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
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                      {label}
                    </p>
                    <p
                      className="mt-2 text-sm font-bold text-gray-900 truncate"
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
