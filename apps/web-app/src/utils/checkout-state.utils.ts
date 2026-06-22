export interface CheckoutReservationState {
  orderId: string;
  concertId: string;
  concertTitle: string;
  venue: string;
  date: string;
  tierId: string;
  tierName: string;
  price: number;
  quantity: number;
  remaining: number;
  reservedAt: string;
  expiresAt: string;
}

const CHECKOUT_STATE_KEY = "ticketbox.checkout.reservation";

export function saveCheckoutReservationState(state: CheckoutReservationState) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(state));
}

export function getCheckoutReservationState() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(CHECKOUT_STATE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CheckoutReservationState;
  } catch {
    return null;
  }
}

export function clearCheckoutReservationState() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CHECKOUT_STATE_KEY);
}
