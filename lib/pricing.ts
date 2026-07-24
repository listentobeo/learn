import type { Track } from "./types";

export type PaymentPlan = "full" | "monthly";
export type Currency = "NGN" | "USD";

export const coursePrices: Record<Track, Record<Currency, { full: number; monthly?: number }>> = {
  Discovery: {
    NGN: { full: 15000 },
    USD: { full: 10 },
  },
  Drawing: {
    NGN: { full: 48000, monthly: 20000 },
    USD: { full: 32, monthly: 14 },
  },
  Painting: {
    NGN: { full: 48000, monthly: 20000 },
    USD: { full: 32, monthly: 14 },
  },
};

export function formatPrice(amount: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function dualPrice(track: Track) {
  return `${formatPrice(coursePrices[track].NGN.full, "NGN")} / ${formatPrice(coursePrices[track].USD.full, "USD")}`;
}
