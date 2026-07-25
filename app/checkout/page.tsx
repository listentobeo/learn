import { headers } from "next/headers";
import { CheckoutForm } from "@/components/checkout-form";
import { Logo } from "@/components/logo";
import { resolveCountryCode } from "@/lib/geo";
import type { Track } from "@/lib/types";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const params = await searchParams;
  const track = (["Drawing", "Painting", "Discovery"].includes(params.track || "") ? params.track : "Drawing") as Track;
  const countryCode = await resolveCountryCode(await headers());
  return <div className="shell"><header className="topbar container"><Logo /></header><CheckoutForm track={track} countryCode={countryCode} /></div>;
}
