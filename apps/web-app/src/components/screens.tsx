"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
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
import { ArrowRight, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatConcertCurrency,
  formatConcertDateTime,
  getConcertById,
  getConcerts,
  type ConcertDetailItem,
  type ConcertCardItem,
} from "@/services/concert.service";
import { reserveTickets } from "@/services/ticketing.service";
import {
  getCheckoutReservationState,
  saveCheckoutReservationState,
  type CheckoutReservationState,
} from "@/utils/checkout-state.utils";
import { Search } from "lucide-react";

export function HeroCarousel() {
  const [concerts, setConcerts] = useState<ConcertDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadFeaturedConcerts = async () => {
      try {
        const response = await getConcerts({ page: 1, limit: 4 });

        if (!isActive) return;

        const details = await Promise.all(
          response.items.map((item) => getConcertById(item.id))
        );

        if (!isActive) return;

        setConcerts(details.filter(Boolean) as ConcertDetailItem[]);
      } catch {
        if (!isActive) return;
        setConcerts([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadFeaturedConcerts();

    return () => {
      isActive = false;
    };
  }, []);
  const changeSlide = useCallback(
    (nextIndex: number) => {
      setActiveIndex((current) => {
        if (current === nextIndex) return current;
        setPrevIndex(current);

        if (transitionTimeout.current) {
          clearTimeout(transitionTimeout.current);
        }
        transitionTimeout.current = setTimeout(() => {
          setPrevIndex(null);
        }, 600);

        return nextIndex;
      });
    },
    []
  );

  const goPrev = useCallback(() => {
    if (concerts.length === 0) return;
    changeSlide((activeIndex - 1 + concerts.length) % concerts.length);
  }, [concerts.length, activeIndex, changeSlide]);

  const goNext = useCallback(() => {
    if (concerts.length === 0) return;
    changeSlide((activeIndex + 1) % concerts.length);
  }, [concerts.length, activeIndex, changeSlide]);

  useEffect(() => {
    return () => {
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
    };
  }, []);

  const featuredConcert = concerts[activeIndex] ?? null;
  const previousConcert = prevIndex !== null ? concerts[prevIndex] ?? null : null;

  const getImageSrc = (concert: ConcertDetailItem | null) =>
    concert?.posterUrl &&
      concert.posterUrl !==
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA96Q00R_bgOVwdSaXoQUFh4qVfI9j-ywdZH0M0n3UEcHkvg27Hc-IVfeqDv0zY5rITz7LfLg-PsHR9fs9vCYLfdTAr48gFSFvlNJyw4aYMTmFgn4tN5xZElV5qJh_mOyC71TmCRwrv-jb1WAzhPD1I6c0R12LHOwt6JrVxYEjLIbk9nj2yHFMRzZzrZ2Vw_pevGqUI5SmxPE1-MUNxiSPVF38B0OBBXFGSoYc6d9xUgDg0Ex-TwrOwqrqg3paEsKJJvwFVtnwg9sih"
      ? concert.posterUrl
      : "/Mockimg.webp";

  const title = loading
    ? "Loading featured concert..."
    : (featuredConcert?.title ?? "No featured concert available");
  const badge = featuredConcert?.status ?? "Featured event";
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
    <section className="group relative overflow-hidden bg-[#111318] text-white min-h-[600px] flex items-end pb-16">
      {/* Ảnh cũ — fade out, giữ lại trong lúc ảnh mới fade in để tránh giật/đen màn hình */}
      {previousConcert && (
        <img
          key={`prev-${previousConcert.id}`}
          src={getImageSrc(previousConcert)}
          className="absolute inset-0 w-full h-full object-cover"
          alt=""
        />
      )}

      {/* Ảnh hiện tại — fade in chồng lên ảnh cũ */}
      {featuredConcert && (
        <img
          key={`current-${featuredConcert.id}`}
          src={getImageSrc(featuredConcert)}
          className="absolute inset-0 w-full h-full object-cover opacity-0 animate-fade-in-quick"
          alt={featuredConcert.title}
        />
      )}

      <div className="absolute inset-0 bg-linear-to-t from-[#111318]/90 via-[#111318]/20 to-transparent transition-opacity duration-700 opacity-90 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-linear-to-r from-[#111318]/80 via-[#111318]/30 to-transparent transition-opacity duration-700 opacity-0 group-hover:opacity-100" />
      <div className="hero-shimmer absolute inset-0 opacity-20 mix-blend-overlay transition-opacity duration-700 group-hover:opacity-40" />

      {concerts.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Concert trước"
          className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/60 hover:scale-105 active:scale-95 sm:left-5 sm:h-12 sm:w-12"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {concerts.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Concert tiếp theo"
          className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:bg-black/60 hover:scale-105 active:scale-95 sm:right-5 sm:h-12 sm:w-12"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
        <div
          key={featuredConcert?.id ?? "empty"}
          className="max-w-2xl animate-[fadeSlideUp_0.5s_ease-out_forwards]"
        >
          <div className="space-y-3 transform transition-transform duration-700 ease-out group-hover:-translate-y-2">
            <Badge className="border border-white/20 bg-surface/20 backdrop-blur-md text-white shadow-xl px-3.5 py-1 rounded-full uppercase tracking-wider text-[11px] font-bold inline-flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary"></span>
              </span>
              {badge}
            </Badge>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl drop-shadow-xl text-white line-clamp-2">
              {title}
            </h1>
          </div>

          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-700 ease-in-out group-hover:grid-rows-[1fr] group-hover:opacity-100">
            <div className="overflow-hidden">
              <div className="pt-4">
                <p className="max-w-xl text-sm leading-relaxed text-white/90 sm:text-base drop-shadow-lg mb-6 line-clamp-2">
                  {description}
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    href={
                      featuredConcert
                        ? `/concerts/${featuredConcert.id}`
                        : "/catalog"
                    }
                    variant="secondary"
                    className="group/btn bg-primary hover:bg-primary-container text-white border-0 shadow-[0_0_30px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_50px_rgba(var(--color-primary),0.5)] px-6 py-3 text-sm transition-all duration-300"
                  >
                    {loading ? "Loading..." : "Xem chi tiết"}
                    <ArrowRight
                      size={16}
                      className="ml-2 transform transition-transform duration-300 group-hover/btn:translate-x-1"
                    />
                  </Button>
                  {ticketTier && (
                    <span className="text-xs font-semibold text-white/70">
                      {priceLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {concerts.length > 1 && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {concerts.map((concert, index) => (
            <button
              key={concert.id}
              type="button"
              onClick={() => changeSlide(index)}
              aria-label={`Xem concert ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${index === activeIndex
                ? "w-6 bg-white"
                : "w-2 bg-white/40 hover:bg-white/60"
                }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function ConcertCard({
  concert,
  featured = false,
}: {
  concert: ConcertCardItem | (typeof concerts)[number];
  featured?: boolean;
}) {
  return (
    <Card
      className={`group h-full overflow-hidden flex flex-col p-0 bg-surface border border-outline-variant shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 hover:-translate-y-1 ${featured ? "sm:flex-row rounded-4xl" : "rounded-3xl"}`}
    >
      <div
        className={`relative overflow-hidden ${featured ? "w-full sm:w-5/12 min-h-[280px] sm:min-h-full" : "w-full h-64"}`}
      >
        <img
          src={
            (concert as Record<string, unknown>).posterUrl &&
              typeof (concert as Record<string, unknown>).posterUrl ===
              "string" &&
              (concert as Record<string, unknown>).posterUrl !==
              "https://lh3.googleusercontent.com/aida-public/AB6AXuA96Q00R_bgOVwdSaXoQUFh4qVfI9j-ywdZH0M0n3UEcHkvg27Hc-IVfeqDv0zY5rITz7LfLg-PsHR9fs9vCYLfdTAr48gFSFvlNJyw4aYMTmFgn4tN5xZElV5qJh_mOyC71TmCRwrv-jb1WAzhPD1I6c0R12LHOwt6JrVxYEjLIbk9nj2yHFMRzZzrZ2Vw_pevGqUI5SmxPE1-MUNxiSPVF38B0OBBXFGSoYc6d9xUgDg0Ex-TwrOwqrqg3paEsKJJvwFVtnwg9sih"
              ? ((concert as Record<string, unknown>).posterUrl as string)
              : "/Mockimg.webp"
          }
          alt={concert.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-bg-[#111318]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute top-4 left-4 bg-surface/95 backdrop-blur-md text-on-surface px-3 py-2 rounded-2xl flex flex-col items-center shadow-lg border border-white/50 transform transition-transform duration-500 group-hover:-translate-y-1">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant/70 tracking-wider">
            {concert.date.split(" ")[0] || "OCT"}
          </span>
          <span className="text-xl font-black text-primary leading-none mt-1">
            {concert.date.split(" ")[1]?.replace(",", "") || "15"}
          </span>
        </div>
      </div>
      <div
        className={`flex flex-1 flex-col justify-between bg-surface transition-colors duration-500 group-hover:bg-surface-low/50 ${featured ? "p-8 sm:p-10 sm:w-7/12" : "p-6 w-full"}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              {concert.status}
            </span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-black text-on-surface transition-colors duration-300 group-hover:text-primary line-clamp-2">
            {concert.title}
          </h3>
          {featured && (
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant line-clamp-3">
              {concert.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-on-surface-variant/70 font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-on-surface-variant/50"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{concert.venue}</span>
          </div>
        </div>
        <div className="mt-8 flex items-end justify-between border-t border-outline-variant pt-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50 font-bold mb-1">
              Starting from
            </p>
            <p className="text-2xl font-black text-on-surface">
              {concert.price}
            </p>
          </div>
          <Link
            href={`/concerts/${concert.id}`}
            className={`group/btn inline-flex items-center justify-center gap-2 overflow-hidden relative transition-all duration-300 ${featured
              ? "bg-[#111318] text-white w-12 h-12 rounded-full hover:bg-primary shadow-md hover:shadow-lg hover:-translate-y-0.5"
              : "bg-surface border-2 border-outline-variant text-on-surface px-6 py-2.5 rounded-full text-sm font-bold hover:border-primary hover:text-primary hover:bg-primary/5"
              }`}
          >
            {featured ? (
              <ArrowRight
                size={20}
                className="transform transition-transform duration-300 group-hover/btn:translate-x-1"
              />
            ) : (
              <>
                <span className="relative z-10 transition-transform duration-300 group-hover/btn:-translate-x-1">
                  Tickets
                </span>
                <ArrowRight
                  size={16}
                  className="absolute right-4 transform transition-all duration-300 translate-x-4 opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100"
                />
              </>
            )}
          </Link>
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
    <Card className="overflow-hidden border-0 shadow-lg bg-surface">
      <div className="p-8">
        <div className="flex items-center justify-between">
          <SectionHeading
            eyebrow="TICKETS"
            title="Real-Time Availability"
            description="Select from standing, priority, or lounge access."
          />
        </div>

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
                  className={`p-5 cursor-pointer rounded-[20px] border-2 transition-all duration-200 ${isSelected
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
            <p className="text-sm text-on-surface-variant/70">
              No ticket tiers available.
            </p>
          )}
        </div>

        {selectedTier && (
          <div className="mt-8 border-t border-outline-variant pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Select Quantity
                </p>
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  {maxQty > 0
                    ? `Limit: ${maxQty} tickets per user`
                    : "Sold out right now"}
                </p>
              </div>
              <div className="flex items-center gap-4 bg-surface-low border border-outline rounded-xl p-1">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface text-lg font-bold text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-on-surface text-lg">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={maxQty < 1 || quantity >= maxQty}
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface text-lg font-bold text-on-surface-variant disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-low p-4 border border-outline-variant">
              <div className="flex items-center justify-between text-sm text-on-surface-variant mb-2">
                <span>
                  Subtotal ({quantity} x{" "}
                  {formatConcertCurrency(selectedTier.price)})
                </span>
                <span className="font-semibold">
                  {formatConcertCurrency(selectedTier.price * quantity)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-outline pt-2 text-base font-bold text-on-surface">
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

  const spotlightRef = useRef<HTMLDivElement>(null);

  function handlePosterMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = spotlightRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.background = `radial-gradient(320px circle at ${x}% ${y}%, rgba(216,181,110,0.22), transparent 70%)`;
  }

  function handlePosterLeave() {
    const el = spotlightRef.current;
    if (el) el.style.background = "transparent";
  }

  return (
    <section
      className="relative overflow-hidden rounded-[28px] shadow-2xl"
      style={{ backgroundColor: "#15111c" }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ticket-rise {
            opacity: 0;
            transform: translateY(10px);
            animation: ticketRise 0.7s cubic-bezier(0.16, 0.84, 0.44, 1) forwards;
          }
          @keyframes ticketRise {
            to { opacity: 1; transform: translateY(0); }
          }
          .ticket-poster {
            opacity: 0;
            transform: scale(1.04);
            animation: ticketPoster 0.9s cubic-bezier(0.16, 0.84, 0.44, 1) forwards;
          }
          @keyframes ticketPoster {
            to { opacity: 1; transform: scale(1); }
          }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#d8b56e]/10 blur-3xl" />

      <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_28px_1fr]">
        <div
          className="relative z-10 flex flex-col gap-7 p-6 sm:p-8 lg:p-10"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.045), transparent)",
          }}
        >
          <div className="ticket-rise" style={{ animationDelay: "60ms" }}>
            <SectionHeading
              tone="dark"
              eyebrow={
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[#d8b56e] opacity-70 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#d8b56e]" />
                  </span>
                  {concert.status}
                </span>
              }
              title={concert.title}
            />
          </div>

          <div
            className="ticket-rise flex flex-col gap-4 border-t border-[#f6f2ec]/10 pt-6 text-sm"
            style={{ animationDelay: "180ms" }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-[#d8b56e]/25 bg-[#d8b56e]/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d8b56e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f6f2ec]/45">
                  Thời gian
                </span>
                <span className="font-mono text-sm text-[#f6f2ec]">
                  {time ? `${time} · ` : ""}
                  {date}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-[#d8b56e]/25 bg-[#d8b56e]/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d8b56e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f6f2ec]/45">
                  Địa điểm
                </span>
                <span className="text-sm font-semibold text-[#f6f2ec]">
                  {concert.venue}
                  {concert.city ? (
                    <span className="font-normal text-[#f6f2ec]/55">
                      , {concert.city}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEAM — mobile: horizontal tear line */}
        <div className="flex lg:hidden items-center gap-2 px-6">
          <span className="h-3 w-3 rounded-full bg-[#15111c] ring-1 ring-[#d8b56e]/30 ml-[-22px]" />
          <span className="flex-1 border-t border-dashed border-[#f6f2ec]/15" />
          <span className="h-3 w-3 rounded-full bg-[#15111c] ring-1 ring-[#d8b56e]/30 mr-[-22px]" />
        </div>

        {/* SEAM — desktop: vertical tear line with rotated stub label */}
        <div className="relative hidden lg:flex flex-col items-center py-6">
          <span className="h-3 w-3 rounded-full bg-[#15111c] ring-1 ring-[#d8b56e]/30 mt-[-22px]" />
          <span className="mt-2 flex-1 w-px border-l border-dashed border-[#f6f2ec]/15" />
          <span className="my-3 rotate-180 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.3em] text-[#f6f2ec]/30 [writing-mode:vertical-rl]">
            Vé điện tử
          </span>
          <span className="flex-1 w-px border-l border-dashed border-[#f6f2ec]/15" />
          <span className="h-3 w-3 rounded-full bg-[#15111c] ring-1 ring-[#d8b56e]/30 mb-[-22px]" />
        </div>

        {/* RIGHT: poster */}
        <div
          className="ticket-poster relative min-h-[280px] sm:min-h-[380px] lg:min-h-[520px] overflow-hidden"
          onMouseMove={handlePosterMove}
          onMouseLeave={handlePosterLeave}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={concert.posterUrl || "/Mockimg.webp"}
            alt={concert.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
          />

          {/* cursor-driven stage spotlight */}
          <div
            ref={spotlightRef}
            className="pointer-events-none absolute inset-0 transition-[background] duration-200"
          />

          {/* legibility fades, anchored to the ink tone so the seam reads continuous */}
          <div
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{
              backgroundImage:
                "linear-gradient(to right, #15111c 0%, rgba(21,17,28,0.05) 30%, transparent 55%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to top, rgba(21,17,28,0.65) 0%, transparent 38%)",
            }}
          />
        </div>
      </div>
    </section>
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
            <Badge className="bg-surface/15 text-white">Seat selection</Badge>
            <h2 className="mt-4 font-display text-3xl font-black">
              Central Stadium
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Stage view, zone labels, and ticket availability
            </p>
          </div>
          <div className="rounded-2xl bg-surface/10 px-4 py-3 text-right backdrop-blur">
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              Stage
            </div>
            <div className="mt-1 text-lg font-black">Front</div>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-10 gap-2 rounded-4xl border border-outline-variant bg-surface-low p-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="rounded-xl bg-surface py-2">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="rounded-4xl bg-surface-low p-4">
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
              <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-surface shadow-sm">
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
              <span className="mx-auto mt-[3px] block h-2.5 w-2.5 rounded-full bg-surface" />
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
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-md">
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
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/20 bg-surface/10 pulse-ring">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-surface/15 backdrop-blur">
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
            <div className="mt-4 rounded-3xl bg-surface p-4 shadow-xl">
              <div className="qr-grid">
                {Array.from({ length: 49 }, (_, index) => (
                  <span
                    key={index}
                    className={
                      index % 3 === 0 || index % 7 === 0 || index % 11 === 0
                        ? "bg-slate-900"
                        : "bg-surface"
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
              className="w-full border border-white/20 text-white hover:bg-surface/10"
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
          <div className="flex h-18 w-18 items-center justify-center rounded-full bg-surface/15 text-2xl font-black">
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
          <Badge className="border border-white/20 bg-surface/10 text-white">
            Support center
          </Badge>
          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
            How can we help you today?
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/80">
            Search for FAQs, guides, and order help, or choose a category below
            to jump straight into the right support flow.
          </p>
          <div className="flex flex-wrap gap-3 rounded-3xl bg-surface/10 p-3 backdrop-blur">
            <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-on-surface shadow-lg">
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
          <Badge className="bg-surface/10 text-white">Your tickets</Badge>
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

export function SeatMapViewer({ mapUrl }: { mapUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const effectiveUrl =
    mapUrl && mapUrl !== "https://cdn.ticketbox.local/maps/default.svg"
      ? mapUrl
      : "/mock/seat_map.svg";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.min(s + 0.5, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((s) => Math.max(s - 0.5, 0.5));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const onMouseUp = () => setIsDragging(false);

  return (
    <>
      <div
        onClick={() => {
          setScale(1);
          setPosition({ x: 0, y: 0 });
          setIsOpen(true);
        }}
        className="group bg-surface-low rounded-2xl border border-outline-variant p-8 flex flex-col items-center justify-center min-h-[300px] hover:bg-outline-variant/30 transition-colors cursor-pointer relative overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effectiveUrl}
          alt="Seat Map"
          className="w-full h-auto max-h-[350px] object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-surface/0 group-hover:bg-surface/40 transition-colors duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="inline-flex items-center justify-center p-4 bg-primary rounded-full shadow-xl mb-3 text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <ZoomIn size={28} />
          </div>
          <p className="text-sm font-bold text-on-surface transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 bg-surface/90 px-4 py-1.5 rounded-full shadow-sm">
            Click to View Map Details
          </p>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#111318]/95 backdrop-blur-md">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-3 bg-surface/10 hover:bg-surface/20 rounded-full transition-colors z-50"
          >
            <X size={24} />
          </button>

          <div className="absolute bottom-10 flex items-center gap-2 bg-surface/10 backdrop-blur-xl p-2 rounded-2xl z-50 border border-white/20 shadow-2xl">
            <button
              onClick={handleZoomOut}
              className="p-3 text-white hover:bg-surface/20 rounded-xl transition-colors active:scale-95"
            >
              <ZoomOut size={24} />
            </button>
            <div className="w-px h-8 bg-surface/20 mx-2" />
            <button
              onClick={handleZoomIn}
              className="p-3 text-white hover:bg-surface/20 rounded-xl transition-colors active:scale-95"
            >
              <ZoomIn size={24} />
            </button>
          </div>

          <div
            className={`w-full h-full overflow-hidden flex items-center justify-center ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveUrl}
              alt="Seat Map Fullscreen"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging
                  ? "none"
                  : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
              }}
              className="max-w-[90vw] max-h-[90vh] object-contain pointer-events-none drop-shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function useRevealOnView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export function RevealItem({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useRevealOnView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
