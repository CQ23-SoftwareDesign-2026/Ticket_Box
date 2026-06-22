"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  activityTimeline,
  concerts,
  orderConfirmed,
  orderSummary,
  profileStats,
  seatLegend,
  seatRows,
  supportCategories,
  supportContacts,
  ticketTabs,
  tickets,
} from "@/lib/mock-data";
import { Badge, Button, Card, SectionHeading, Tabs } from "@/components/common";
import { ArrowRight } from "lucide-react";
import {
  formatConcertCurrency,
  formatConcertDateTime,
  getConcertById,
  getConcerts,
  type ConcertDetailItem,
} from "@/services/concert.service";
import { reserveTickets } from "@/services/ticketing.service";
import {
  getCheckoutReservationState,
  saveCheckoutReservationState,
  type CheckoutReservationState,
} from "@/utils/checkout-state.utils";
import { Search } from "lucide-react";

export function HeroCarousel() {
  const [featuredConcert, setFeaturedConcert] =
    useState<ConcertDetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadFeaturedConcert = async () => {
      try {
        const response = await getConcerts({ page: 1, limit: 1 });

        if (!isActive) {
          return;
        }

        const firstConcert = response.items[0];

        if (!firstConcert) {
          setFeaturedConcert(null);
          return;
        }

        const detail = await getConcertById(firstConcert.id);

        if (!isActive) {
          return;
        }

        setFeaturedConcert(detail);
      } catch {
        if (!isActive) {
          return;
        }

        setFeaturedConcert(null);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadFeaturedConcert();

    return () => {
      isActive = false;
    };
  }, []);

  const title = loading
    ? "Loading featured concert..."
    : (featuredConcert?.title ?? "No featured concert available");
  const badge = featuredConcert?.status ?? "Featured event";
  const dateTime = featuredConcert
    ? formatConcertDateTime(featuredConcert.startTime)
    : { date: "TBA", time: "" };
  const date = dateTime.date;
  const time = dateTime.time;
  const venue = featuredConcert?.venue ?? "Awaiting venue";
  const city = featuredConcert?.city ?? "Awaiting city";
  const description = loading
    ? "We are loading the latest concert from the database."
    : featuredConcert?.aiBio ||
      featuredConcert?.description ||
      "No featured concert is available right now.";
  const ticketTier = featuredConcert?.ticketTiers?.[0];
  const priceLabel = ticketTier
    ? `${ticketTier.name} • ${formatConcertCurrency(ticketTier.price)}`
    : featuredConcert
      ? "Ticket tiers unavailable"
      : "Loading...";

  return (
    <section className="relative overflow-hidden bg-surface text-white">
      <div className="hero-shimmer absolute inset-0 opacity-95" />
      <div className="surface-grid absolute inset-0 opacity-20" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl space-y-6">
          <Badge className="border border-white/20 bg-white/10 text-white">
            {badge}
          </Badge>
          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            {description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              href={
                featuredConcert ? `/concerts/${featuredConcert.id}` : "/catalog"
              }
              variant="secondary"
            >
              {loading ? "Loading..." : "Buy Tickets"} <ArrowRight size={18} />
            </Button>
            <Button
              href="/support"
              variant="ghost"
              className="border border-white/20 text-white hover:bg-white/10"
            >
              Need help
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/75">
            <span className="rounded-full bg-white/10 px-4 py-2">{date}</span>
            {time ? (
              <span className="rounded-full bg-white/10 px-4 py-2">{time}</span>
            ) : null}
            <span className="rounded-full bg-white/10 px-4 py-2">{venue}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">{city}</span>
          </div>
        </div>
        <Card className="border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                  Featured tour
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">
                  {title}
                </h2>
              </div>
              <Badge className="bg-white/15 text-white">{badge}</Badge>
            </div>
            <div className="grid gap-3 rounded-2xl bg-white/10 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Start time
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {date}
                  {time ? ` • ${time}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Price
                </p>
                <p className="mt-1 text-lg font-semibold">{priceLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">
                  Max / user
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {ticketTier?.max_per_user ?? "N/A"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm leading-6 text-white/80">{description}</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

export function ConcertCard({
  concert,
  featured = false,
}: {
  concert: (typeof concerts)[number];
  featured?: boolean;
}) {
  return (
    <Card
      className={`card-lift h-full overflow-hidden ${featured ? "border-primary/30 bg-gradient-to-br from-white to-primary/5" : ""}`}
    >
      <div className="flex h-full flex-col">
        <div
          className={`ticket-grid flex items-start justify-between gap-4 p-5 ${featured ? "min-h-44" : "min-h-36"}`}
        >
          <div className="max-w-[70%] space-y-2">
            <Badge className="bg-white/90 text-primary">{concert.genre}</Badge>
            <h3 className="font-display text-2xl font-bold text-on-surface">
              {concert.title}
            </h3>
            <p className="text-sm leading-6 text-on-surface-variant">
              {concert.description}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-error">
              {concert.date}
            </div>
            <div className="text-xl font-black text-on-surface">
              {concert.price}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-between p-5">
          <div className="space-y-2 text-sm text-on-surface-variant">
            <p>
              {concert.venue} · {concert.city}
            </p>
            <p>{concert.time}</p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              {concert.status}
            </span>
            <Link
              href={`/concerts/${concert.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              View details <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SeatMapSvg({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 400"
      width="100%"
      height="100%"
      className={className}
    >
      <style>{`
        .zone {
          cursor: pointer;
          transition: fill 0.2s ease, opacity 0.2s ease;
          stroke: #ffffff;
          stroke-width: 2;
        }
        .zone:hover {
          opacity: 0.8;
          stroke: #00ff00;
          stroke-width: 3;
        }
      `}</style>

      <rect x="250" y="20" width="300" height="40" fill="#333333" rx="5" />
      <text
        x="400"
        y="45"
        fill="#ffffff"
        fontFamily="Arial"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
      >
        STAGE
      </text>

      <rect
        id="zone-svip-01"
        className="zone"
        x="250"
        y="90"
        width="300"
        height="80"
        fill="#ff007f"
        rx="8"
      />
      <text
        x="400"
        y="135"
        fill="#ffffff"
        fontFamily="Arial"
        fontSize="18"
        fontWeight="bold"
        textAnchor="middle"
        pointerEvents="none"
      >
        SUPER VIP (SVIP)
      </text>

      <polygon
        id="zone-vip-left"
        className="zone"
        points="80,190 230,190 230,290 120,290"
        fill="#ffaa00"
      />
      <text
        x="160"
        y="245"
        fill="#ffffff"
        fontFamily="Arial"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
        pointerEvents="none"
      >
        VIP LEFT
      </text>

      <polygon
        id="zone-vip-right"
        className="zone"
        points="570,190 720,190 680,290 570,290"
        fill="#ffaa00"
      />
      <text
        x="640"
        y="245"
        fill="#ffffff"
        fontFamily="Arial"
        fontSize="16"
        fontWeight="bold"
        textAnchor="middle"
        pointerEvents="none"
      >
        VIP RIGHT
      </text>

      <rect
        id="zone-ga-01"
        className="zone"
        x="250"
        y="190"
        width="300"
        height="100"
        fill="#007bff"
        rx="8"
      />
      <text
        x="400"
        y="245"
        fill="#ffffff"
        fontFamily="Arial"
        fontSize="18"
        fontWeight="bold"
        textAnchor="middle"
        pointerEvents="none"
      >
        STANDARD (GA)
      </text>
    </svg>
  );
}

export function InteractiveTicketSelector({
  concert,
}: {
  concert: ConcertDetailItem;
}) {
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);

  const tiers = concert.ticketTiers ?? [];
  const selectedTier = tiers[selectedIdx];
  const maxQty = selectedTier ? selectedTier.max_per_user : 0;

  const handleConfirm = async () => {
    if (!selectedTier || isReserving || maxQty < 1) return;

    setIsReserving(true);
    setError(null);

    try {
      const response = await reserveTickets({
        concert_id: concert.id,
        items: [
          {
            category_id: selectedTier.id,
            quantity,
          },
        ],
      });

      saveCheckoutReservationState({
        orderId: response.order_id,
        concertId: concert.id,
        concertTitle: concert.title,
        venue: concert.venue,
        date: concert.date,
        tierId: selectedTier.id,
        tierName: selectedTier.name,
        price: selectedTier.price,
        quantity,
        remaining: response.items[0]?.remaining ?? 0,
        reservedAt: new Date().toISOString(),
        // The backend does not return expires_at, so we derive the 10-minute
        // ceiling here, at reservation time. This anchor is written once to
        // localStorage and is NEVER regenerated on subsequent page mounts.
        expiresAt:
          response.expires_at ??
          new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      router.push(`/checkout/${response.order_id}`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reserve tickets right now.",
      );
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-white">
      <div className="p-8">
        <SectionHeading
          eyebrow="TICKET TIERS"
          title="Choose your experience"
          description="Select from standing, priority, or lounge access."
        />

        <div className="mt-8 space-y-3">
          {tiers.length > 0 ? (
            tiers.map((tier, index) => {
              const isSelected = selectedIdx === index;
              return (
                <div
                  key={tier.id || tier.name}
                  onClick={() => {
                    setSelectedIdx(index);
                    setQuantity(1);
                    setError(null);
                  }}
                  className={`p-5 cursor-pointer rounded-[20px] border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm scale-[1.01]"
                      : "border-outline-variant/60 bg-surface hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant font-bold">
                        {tier.name}
                      </p>
                      <p className="text-xs leading-6 text-on-surface-variant">
                        Max: {tier.max_per_user} tickets per user • Total
                        capacity: {tier.total_quantity} seats
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-on-surface">
                        {formatConcertCurrency(tier.price)}
                      </div>
                      {index === 0 && (
                        <Badge className="mt-2 bg-primary text-on-primary">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500">No ticket tiers available.</p>
          )}
        </div>

        {selectedTier && (
          <div className="mt-8 border-t border-gray-100 pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Select Quantity
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {maxQty > 0
                    ? `Limit: ${maxQty} tickets per user`
                    : "Sold out right now"}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl p-1">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-lg font-bold text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-gray-900 text-lg">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={maxQty < 1 || quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white text-lg font-bold text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>
                  Subtotal ({quantity} x{" "}
                  {formatConcertCurrency(selectedTier.price)})
                </span>
                <span className="font-semibold">
                  {formatConcertCurrency(selectedTier.price * quantity)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                <span>Estimated Total</span>
                <span>
                  {formatConcertCurrency(selectedTier.price * quantity)}
                </span>
              </div>
            </div>

            <button
              onClick={() => void handleConfirm()}
              disabled={isReserving || maxQty < 1}
              className="ticketbox-button-primary w-full justify-center py-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReserving ? "Reserving seats..." : "Confirm and Checkout"}
            </button>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ConcertDetailHero({ concert }: { concert: ConcertDetailItem }) {
  const dateTime = formatConcertDateTime(concert.startTime);
  const date = dateTime.date;
  const time = dateTime.time;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-white via-white to-primary/5 p-0">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 p-6 sm:p-8">
          <Badge className="bg-primary/10 text-primary">{concert.status}</Badge>
          <h1 className="font-display text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
            {concert.title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-on-surface-variant">
            {concert.aiBio || concert.description}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-on-surface-variant">
            <span className="rounded-full bg-surface-low px-4 py-2">
              {date}
              {time ? ` · ${time}` : ""}
            </span>
            <span className="rounded-full bg-surface-low px-4 py-2">
              {concert.venue}
            </span>
            {concert.city && (
              <span className="rounded-full bg-surface-low px-4 py-2">
                {concert.city}
              </span>
            )}
          </div>
        </div>
        <div className="bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.35),_transparent_55%),linear-gradient(160deg,_#1f1b4d,_#3525cd_50%,_#712ae2)] p-6 text-white sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70 mb-4 self-start">
              Seat Map Preview
            </p>
            <SeatMapSvg className="w-full h-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TicketTierCard({
  name,
  price,
  note,
  highlight = false,
  href,
}: {
  name: string;
  price: string;
  note: string;
  highlight?: boolean;
  href?: string;
}) {
  const cardContent = (
    <Card
      className={`p-5 card-lift transition-all duration-200 ${href ? "cursor-pointer hover:border-primary/50" : ""} ${highlight ? "border-primary bg-primary/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {name}
          </p>
          <p className="text-sm leading-6 text-on-surface-variant">{note}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-on-surface">{price}</div>
          {highlight ? (
            <Badge className="mt-2 bg-primary text-on-primary">
              Recommended
            </Badge>
          ) : null}
        </div>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export function VenueMap() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="hero-sheen p-6 text-white">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Badge className="bg-white/15 text-white">Seat selection</Badge>
            <h2 className="mt-4 font-display text-3xl font-black">
              Central Stadium
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Stage view, zone labels, and ticket availability
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              Stage
            </div>
            <div className="mt-1 text-lg font-black">Front</div>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-10 gap-2 rounded-[2rem] border border-outline-variant bg-surface-low p-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="rounded-xl bg-surface py-2">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="rounded-[2rem] bg-surface-low p-4">
          <div className="grid grid-cols-10 gap-2">
            {seatRows.map((row, rowIndex) =>
              row.map((seat, seatIndex) => {
                const className =
                  seat === "selected"
                    ? "bg-primary text-white"
                    : seat === "reserved"
                      ? "bg-secondary text-white"
                      : seat === "accessible"
                        ? "bg-tertiary text-white"
                        : "bg-surface text-on-surface";
                return (
                  <div
                    key={`${rowIndex}-${seatIndex}`}
                    className={`flex aspect-square items-center justify-center rounded-xl border border-outline-variant text-[11px] font-semibold shadow-sm ${className}`}
                  >
                    {seat === "reserved"
                      ? "X"
                      : seat === "accessible"
                        ? "A"
                        : `${rowIndex + 1}${seatIndex + 1}`}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SeatLegendCard() {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
        Legend
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {seatLegend.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center gap-3 rounded-xl bg-surface-low px-3 py-2 text-sm"
          >
            <span className={`h-3 w-3 rounded-full ${entry.color}`} />
            {entry.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CustomerInfoForm() {
  return (
    <Card className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          1
        </span>
        <h2 className="font-display text-2xl font-bold text-on-surface">
          Your details
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-on-surface-variant">
          First name
          <input
            defaultValue="Alex"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-on-surface-variant">
          Last name
          <input
            defaultValue="Chen"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-on-surface-variant sm:col-span-2">
          Email address
          <input
            defaultValue="alex.chen@example.com"
            type="email"
            className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </label>
      </div>
    </Card>
  );
}

/**
 * High-precision reservation countdown hook.
 *
 * Accepts an optional `orderId` to scope the timer to a specific order.
 * The expiry anchor (expiresAt) is read ONCE from localStorage and never
 * regenerated — so navigating away and returning always resumes the same
 * countdown without any reset.
 */
export function useReservationTimer(orderId?: string) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const state = getCheckoutReservationState();

    // If an orderId is supplied, it must match what is stored; otherwise we
    // would be running the wrong timer for the wrong order.
    if (!state?.expiresAt) return;
    if (orderId && state.orderId !== orderId) return;

    const expiresAtTime = new Date(state.expiresAt).getTime();
    // Guard against a corrupted / unparseable date string.
    if (isNaN(expiresAtTime)) return;

    const updateTimer = () => {
      const remaining = expiresAtTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsExpired(true);
        return true; // signals the caller to stop the interval
      }
      setTimeLeft(remaining);
      return false;
    };

    // Fire immediately so there is no 1-second blank flash on mount.
    if (updateTimer()) return;

    const interval = setInterval(() => {
      if (updateTimer()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
    // orderId is stable for the lifetime of the checkout page, so this is safe.
  }, [orderId]);

  const formatTime = (ms: number | null) => {
    if (ms === null) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return { formattedTime: formatTime(timeLeft), isExpired };
}

export function PaymentMethodPicker() {
  return (
    <Card className="space-y-5 p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          2
        </span>
        <h2 className="font-display text-2xl font-bold text-on-surface">
          Payment method
        </h2>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-white shadow-sm">
                <span className="font-bold text-blue-600">PayOS</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">PayOS</p>
                <p className="text-sm text-on-surface-variant">
                  Secure local payment gateway
                </p>
              </div>
            </div>
            <span className="h-5 w-5 rounded-full border-2 border-primary bg-primary">
              <span className="mx-auto mt-[3px] block h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function OrderSummaryCard() {
  const searchParams = useSearchParams();
  const [checkoutState] = useState<CheckoutReservationState | null>(() => {
    const storedState = getCheckoutReservationState();
    if (storedState) {
      return storedState;
    }

    const tierName = searchParams.get("tierName");
    const price = searchParams.get("price");
    const qty = searchParams.get("qty");

    if (tierName && price && qty) {
      return {
        orderId: searchParams.get("orderId") || orderSummary.orderId,
        concertId: "",
        concertTitle: searchParams.get("title") || orderSummary.event,
        venue: searchParams.get("venue") || orderSummary.venue,
        date: searchParams.get("date") || orderSummary.date,
        tierId: "",
        tierName,
        price: parseFloat(price) || 0,
        quantity: parseInt(qty, 10) || 1,
        remaining: 0,
        reservedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    return null;
  });

  const title =
    checkoutState?.concertTitle ||
    searchParams.get("title") ||
    orderSummary.event;
  const tierName = checkoutState?.tierName || searchParams.get("tierName");
  const price = checkoutState
    ? String(checkoutState.price)
    : searchParams.get("price");
  const qty = checkoutState
    ? String(checkoutState.quantity)
    : searchParams.get("qty");
  const date =
    checkoutState?.date || searchParams.get("date") || orderSummary.date;
  const venue =
    checkoutState?.venue || searchParams.get("venue") || orderSummary.venue;

  let subtotal: string = orderSummary.subtotal;
  let total: string = orderSummary.total;
  let fees: string = orderSummary.fees;
  let seatsText: string = orderSummary.seats;
  const payHref = checkoutState
    ? `/checkout/${checkoutState.orderId}/processing`
    : "/checkout/order-2048/processing";

  if (tierName && price && qty) {
    const qtyVal = parseInt(qty, 10) || 1;
    const priceVal = parseFloat(price) || 0;
    const subtotalVal = priceVal * qtyVal;
    const feesVal = subtotalVal * 0.05;
    const totalVal = subtotalVal + feesVal;

    subtotal = formatConcertCurrency(subtotalVal);
    fees = formatConcertCurrency(feesVal);
    total = formatConcertCurrency(totalVal);
    seatsText = `${qtyVal}x ${tierName} Ticket${qtyVal > 1 ? "s" : ""}`;
  }

  return (
    <Card className="space-y-5 p-6 lg:sticky lg:top-24">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
          Order summary
        </p>
        <h3 className="font-display text-2xl font-bold text-on-surface">
          {title}
        </h3>
      </div>
      <div className="space-y-4 rounded-2xl bg-surface-low p-4 text-sm text-on-surface-variant">
        <p>{date}</p>
        <p>{venue}</p>
        <p>{seatsText}</p>
        {checkoutState ? (
          <p className="text-xs text-on-surface-variant">
            Reservation expires at{" "}
            {new Date(checkoutState.expiresAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        ) : null}
      </div>
      <div className="space-y-3 text-sm text-on-surface-variant">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>{subtotal}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Fees (5% Booking Fee)</span>
          <span>{fees}</span>
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant pt-3 text-base font-semibold text-on-surface">
          <span>Total</span>
          <span>{total}</span>
        </div>
      </div>
      <Button href={payHref} className="w-full justify-center">
        Pay {total}
      </Button>
      <TimerFootnote orderId={checkoutState?.orderId} />
    </Card>
  );
}

export function FloatingCheckoutBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/60 bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Selected seats
          </p>
          <p className="truncate text-sm font-semibold text-on-surface">
            2 seats · VIP Lounge · $316.00
          </p>
        </div>
        <Button href="/checkout/order-2048" className="shrink-0">
          Checkout
        </Button>
      </div>
    </div>
  );
}

/** Small inline timer badge used inside OrderSummaryCard. */
function TimerFootnote({ orderId }: { orderId?: string }) {
  const { formattedTime } = useReservationTimer(orderId);
  return (
    <div className="rounded-2xl bg-primary/5 p-4 text-sm text-on-surface-variant">
      Reservation expires in{" "}
      <span className="font-semibold text-primary">{formattedTime}</span>.
    </div>
  );
}

export function CountdownTimer({ orderId }: { orderId?: string }) {
  const { formattedTime, isExpired } = useReservationTimer(orderId);
  const router = useRouter();

  return (
    <>
      {isExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <Card className="w-full max-w-md p-8 text-center shadow-2xl mx-4">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
              <span className="material-symbols-outlined text-[32px]">
                timer_off
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
              Đã Hết Thời Gian
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
              Thời gian giữ chỗ của bạn đã kết thúc. Các vé đã được phân bổ lại
              phục hồi pool.
            </p>
            <Button className="w-full justify-center" href="/catalog">
              Xác nhận
            </Button>
          </Card>
        </div>
      )}
      <Card className="hero-shimmer p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
          Hold timer
        </p>
        <div className="mt-3 text-4xl font-black">{formattedTime}</div>
        <p className="mt-2 text-sm text-white/80">
          Your reserved seats will release automatically when the timer ends.
        </p>
      </Card>
    </>
  );
}

export function ProcessingAnimation() {
  return (
    <Card className="mx-auto max-w-2xl overflow-hidden p-0">
      <div className="hero-sheen px-6 py-12 text-center text-white sm:px-10">
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-white/10 pulse-ring">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <span className="material-symbols-outlined text-[44px]">
              hourglass_top
            </span>
          </div>
        </div>
        <h1 className="mt-8 font-display text-4xl font-black">
          Processing your payment
        </h1>
        <p className="mt-4 text-base leading-7 text-white/80">
          This may take a few seconds while we confirm your order and issue the
          ticket.
        </p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        {[
          ["Authorization", "Confirmed"],
          ["Seats", "Locked"],
          ["Ticket delivery", "Preparing"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface-low p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              {label}
            </p>
            <p className="mt-2 text-lg font-semibold text-on-surface">
              {value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ETicketCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="ticket-grid grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <Badge className="bg-primary/10 text-primary">Digital ticket</Badge>
            <Badge className="bg-secondary/10 text-secondary">Verified</Badge>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Order code
            </p>
            <h2 className="mt-2 font-display text-3xl font-black text-on-surface">
              {orderConfirmed.code}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                Event
              </p>
              <p className="mt-2 font-semibold text-on-surface">
                {orderConfirmed.title}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                Date
              </p>
              <p className="mt-2 font-semibold text-on-surface">
                {orderConfirmed.date}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                Venue
              </p>
              <p className="mt-2 font-semibold text-on-surface">
                {orderConfirmed.venue}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-low p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                Seats
              </p>
              <p className="mt-2 font-semibold text-on-surface">
                {orderConfirmed.seats}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-6 bg-primary p-6 text-white sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
              QR access
            </p>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-xl">
              <div className="qr-grid">
                {Array.from({ length: 49 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index % 3 === 0 || index % 7 === 0 || index % 11 === 0
                        ? "bg-slate-900"
                        : "bg-white"
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full">
              Add to wallet
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-white/20 text-white hover:bg-white/10"
            >
              Download ticket
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TicketListItem({
  ticket,
}: {
  ticket: (typeof tickets)[number];
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-on-surface">
              {ticket.title}
            </h3>
            <Badge className="bg-primary/10 text-primary">
              {ticket.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            {ticket.date} · {ticket.venue}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">{ticket.zone}</p>
          <p>
            Row {ticket.row} · Seat {ticket.seat}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function ProfileHeader() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="hero-sheen grid gap-6 px-6 py-8 text-white sm:px-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-white/15 text-2xl font-black">
            AC
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">
              TicketBox member
            </p>
            <h1 className="mt-2 font-display text-3xl font-black">Alex Chen</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/80">
          Manage your tickets, preferences, and recent activity from one secure
          profile hub.
        </p>
        <Button
          variant="secondary"
          className="justify-self-start sm:justify-self-end"
        >
          Edit profile
        </Button>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        {profileStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface-low p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-black text-on-surface">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ActivityTimeline() {
  return (
    <Card className="space-y-5 p-6">
      <SectionHeading
        title="Recent activity"
        description="A quick view of the latest changes and ticket events on your account."
      />
      <div className="space-y-4">
        {activityTimeline.map((item) => (
          <div
            key={item.title}
            className="flex gap-4 rounded-2xl bg-surface-low p-4"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-on-surface">{item.title}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                  {item.time}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SupportHero() {
  return (
    <section className="hero-shimmer relative overflow-hidden text-white">
      <div className="surface-grid absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <Badge className="border border-white/20 bg-white/10 text-white">
            Support center
          </Badge>
          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            How can we help you today?
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/80">
            Search for FAQs, guides, and order help, or choose a category below
            to jump straight into the right support flow.
          </p>
          <div className="flex flex-wrap gap-3 rounded-3xl bg-white/10 p-3 backdrop-blur">
            <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-on-surface shadow-lg">
              <Search className="h-4 w-4 text-primary" />
              <input
                type="text"
                placeholder="Search for FAQs, guides, or order help..."
                className="flex-1 bg-transparent text-sm text-on-surface-variant outline-none placeholder:text-on-surface-variant/60"
              />
            </div>
            <Button variant="secondary">Search</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SupportGrid() {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8 lg:grid-cols-2">
      {supportCategories.map((item) => (
        <Card key={item.title} className="card-lift p-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <item.icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-display text-2xl font-bold text-on-surface">
            {item.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {item.description}
          </p>
        </Card>
      ))}
    </section>
  );
}

export function SupportContacts() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Need extra help"
        title="Talk to a human"
        description="Our support team is available for urgent event and payment issues around the clock."
        action={
          <Button href="/profile" variant="soft">
            Open profile
          </Button>
        }
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {supportContacts.map((contact) => (
          <Card
            key={contact.title}
            className="card-lift flex flex-col items-start gap-4 p-6 text-left"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <contact.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-on-surface">
                {contact.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                {contact.description}
              </p>
            </div>
            <Button variant="secondary">{contact.action}</Button>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function MyTicketsHero() {
  return (
    <Card className="hero-shimmer p-6 text-white">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge className="bg-white/10 text-white">Your tickets</Badge>
          <h1 className="mt-4 font-display text-4xl font-black">
            My ticket library
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            Keep your confirmed passes, saved seats, and past events in one
            place.
          </p>
        </div>
        <Tabs items={ticketTabs} active="Upcoming" />
      </div>
    </Card>
  );
}
