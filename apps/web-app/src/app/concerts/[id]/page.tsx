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
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <ConcertDetailHero concert={concert} />
        <div className="grid gap-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              <div className="p-8">
                <SectionHeading
                  eyebrow="About the show"
                  title={concert.title}
                  description={
                    concert.description || "No description provided."
                  }
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
                      className="rounded-xl border-2 border-gray-200 p-4 hover:border-primary/30 transition-colors"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
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
              </div>
            </Card>
            <InteractiveTicketSelector concert={concert} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
